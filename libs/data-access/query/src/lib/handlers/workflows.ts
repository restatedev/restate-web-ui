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
  type QueryContext,
} from './shared';

const WORKFLOW_RUN_LIMIT = 50;
const WORKFLOW_RUN_QUERY_LIMIT = WORKFLOW_RUN_LIMIT + 1;
const SHARED_INVOCATION_LIMIT = 25;
const SHARED_INVOCATION_QUERY_LIMIT = SHARED_INVOCATION_LIMIT + 1;
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
  shared: string[];
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
  return {
    run,
    shared: serviceMetadata.handlers
      .filter((handler) => handler.ty === 'Shared')
      .map((handler) => handler.name),
  };
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

// TODO: Remove this workaround once Restate Server makes
// sys_invocation_status target_service_key predicate pushdown scope-aware.
// Direct equality prunes by the service-key hash, but scoped invocations are
// partitioned by scope and can be skipped. SUBSTR prevents that pruning.
function workflowKeyClause(workflowId: string) {
  return `SUBSTR(target_service_key, 1) = ${quoteSqlString(workflowId)}`;
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
  const sharedHandlerClause = handlers.shared.map(quoteSqlString).join(', ');
  const runPromise = this.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND ${workflowKeyClause(workflowId)}
      AND target_handler_name = ${quoteSqlString(handlers.run)}${scopeClause}
    LIMIT 1`,
  );
  const sharedPromise =
    handlers.shared.length > 0
      ? this.query(
          `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND ${workflowKeyClause(workflowId)}
      AND target_handler_name IN (${sharedHandlerClause})${scopeClause}
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${SHARED_INVOCATION_QUERY_LIMIT}`,
        )
      : Promise.resolve({ rows: [] });
  const [runResult, sharedResult] = await Promise.all([
    runPromise,
    sharedPromise,
  ]);
  const runId = runResult.rows.at(0)?.['id'];
  if (runId == null) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }
  const sharedInvocationsTruncated =
    sharedResult.rows.length > SHARED_INVOCATION_LIMIT;
  const sharedIds = sharedResult.rows
    .slice(0, SHARED_INVOCATION_LIMIT)
    .map((row) => String(row['id']));
  const invocationsById = await hydrateInvocations(
    this,
    [String(runId), ...sharedIds],
    new Date().toISOString(),
  );
  const runInvocation = invocationsById.get(String(runId));
  if (!runInvocation) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }
  const sharedInvocations = sharedIds.flatMap((id) => {
    const invocation = invocationsById.get(id);
    return invocation ? [invocation] : [];
  });

  return Response.json({
    runInvocation,
    sharedInvocations,
    sharedInvocationsLimit: SHARED_INVOCATION_LIMIT,
    sharedInvocationsTruncated,
  } satisfies WorkflowRunDetailsResponse);
}
