import type {
  RawInvocation,
  Service,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocationV2 } from '../convertInvocation';
import { fetchVqueueStatuses } from './vqueue';
import {
  getSysInvocationListColumns,
  quoteSqlString,
  targetServiceKeyClause,
  type QueryContext,
} from './shared';

const WORKFLOW_RUN_LIMIT = 50;
const WORKFLOW_RUN_QUERY_LIMIT = WORKFLOW_RUN_LIMIT + 1;
const RECENT_INVOCATION_LIMIT = 50;
const RECENT_INVOCATION_QUERY_LIMIT = RECENT_INVOCATION_LIMIT + 1;
const MAX_SEARCH_LENGTH = 256;

export type ListWorkflowRunsArgs =
  components['schemas']['ListWorkflowRunsRequest'];
type WorkflowRunSummary = components['schemas']['WorkflowRunSummary'];
type InvocationV2 = components['schemas']['InvocationV2'];
type ListWorkflowRunsResponse =
  components['schemas']['ListWorkflowRunsResponse'];
type WorkflowRunDetailsResponse =
  components['schemas']['WorkflowRunDetailsResponse'];

interface WorkflowHandlers {
  run: string;
}

function notFound(message: string) {
  return Response.json({ message }, { status: 404 });
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

async function getWorkflowHandlers(
  context: QueryContext,
  service: string,
): Promise<WorkflowHandlers | undefined> {
  const serviceMetadata = await context.adminApi<Service>(
    `/services/${encodeURIComponent(service)}`,
  );
  if (serviceMetadata.ty !== 'Workflow') return undefined;
  const run = serviceMetadata.handlers.find(
    (handler) => handler.ty === 'Workflow',
  )?.name;
  if (!run) return undefined;
  return { run };
}

function searchPattern(search: string | undefined) {
  if (!search) return undefined;
  const escaped = search
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
  return quoteSqlString(`%${escaped}%`);
}

function workflowScopeClause(context: QueryContext, scope?: string) {
  if (!context.features.has('vqueues')) return '';
  return scope === undefined
    ? '\n      AND scope IS NULL'
    : `\n      AND scope = ${quoteSqlString(scope)}`;
}

async function hydrateInvocations(
  context: QueryContext,
  ids: string[],
  requestTime: string,
): Promise<Map<string, InvocationV2>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, InvocationV2>();
  const [invocationResult, vqueueStatuses] = await Promise.all([
    context.query(`SELECT ${getSysInvocationListColumns(context.features).join(', ')}
    FROM sys_invocation
    WHERE id IN (${uniqueIds.map(quoteSqlString).join(', ')})`),
    fetchVqueueStatuses(context, uniqueIds),
  ]);
  const invocationById = new Map(
    (invocationResult.rows as RawInvocation[]).map((row) => [row.id, row]),
  );
  return new Map(
    uniqueIds.flatMap((id) => {
      const invocation = invocationById.get(id);
      return invocation
        ? [
            [
              id,
              convertInvocationV2(
                invocation,
                vqueueStatuses.get(id),
                requestTime,
              ),
            ] as const,
          ]
        : [];
    }),
  );
}

export async function listWorkflowRuns(
  this: QueryContext,
  service: string,
  args: ListWorkflowRunsArgs = {},
) {
  const handlers = await getWorkflowHandlers(this, service);
  if (!handlers) {
    return notFound(`${service} is not a Workflow service.`);
  }

  const search = args.search?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
  const pattern = searchPattern(search);
  const searchClause = pattern
    ? `\n      AND (target_service_key LIKE ${pattern}${this.features.has('vqueues') ? ` OR scope LIKE ${pattern}` : ''})`
    : '';
  const { rows: candidateRows } = await this.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND target_handler_name = ${quoteSqlString(handlers.run)}
      AND target_service_key IS NOT NULL${searchClause}
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${WORKFLOW_RUN_QUERY_LIMIT}`,
  );
  const truncated = candidateRows.length > WORKFLOW_RUN_LIMIT;
  const ids = candidateRows
    .slice(0, WORKFLOW_RUN_LIMIT)
    .map((row) => String(row['id']));
  const invocationsById = await hydrateInvocations(
    this,
    ids,
    new Date().toISOString(),
  );
  const rows = ids.flatMap<WorkflowRunSummary>((invocationId) => {
    const runInvocation = invocationsById.get(invocationId);
    return !runInvocation || runInvocation.target_service_key === undefined
      ? []
      : [
          {
            id: runInvocation.target_service_key,
            ...(runInvocation.scope !== undefined
              ? { scope: runInvocation.scope }
              : {}),
            runInvocation,
          },
        ];
  });

  return Response.json({
    rows,
    limit: WORKFLOW_RUN_LIMIT,
    truncated,
  } satisfies ListWorkflowRunsResponse);
}

export async function getWorkflowRun(
  this: QueryContext,
  service: string,
  workflowId: string,
  scope?: string,
) {
  if (scope !== undefined && !this.features.has('vqueues')) {
    return badRequest('Scoped Workflow runs require Virtual Queues.');
  }
  const handlers = await getWorkflowHandlers(this, service);
  if (!handlers) {
    return notFound(`${service} is not a Workflow service.`);
  }

  const scopeClause = workflowScopeClause(this, scope);
  const runPromise = this.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND ${targetServiceKeyClause(this, workflowId)}
      AND target_handler_name = ${quoteSqlString(handlers.run)}${scopeClause}
    LIMIT 1`,
  );
  const recentPromise = this.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND ${targetServiceKeyClause(this, workflowId)}${scopeClause}
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${RECENT_INVOCATION_QUERY_LIMIT}`,
  );
  const [runResult, recentResult] = await Promise.all([
    runPromise,
    recentPromise,
  ]);
  const runId = runResult.rows.at(0)?.['id'];
  if (runId == null) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }
  const recentInvocationsTruncated =
    recentResult.rows.length > RECENT_INVOCATION_LIMIT;
  const recentIds = recentResult.rows
    .slice(0, RECENT_INVOCATION_LIMIT)
    .map((row) => String(row['id']));
  const invocationsById = await hydrateInvocations(
    this,
    [String(runId), ...recentIds],
    new Date().toISOString(),
  );
  const runInvocation = invocationsById.get(String(runId));
  if (!runInvocation) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }
  const recentInvocations = recentIds.flatMap((id) => {
    const invocation = invocationsById.get(id);
    return invocation ? [invocation] : [];
  });

  return Response.json({
    runInvocation,
    recentInvocations,
    recentInvocationsLimit: RECENT_INVOCATION_LIMIT,
    recentInvocationsTruncated,
  } satisfies WorkflowRunDetailsResponse);
}
