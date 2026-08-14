import type {
  RawInvocation,
  Service,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocationV2, durationBetween } from '../convertInvocation';
import { fetchVqueueStatuses } from './vqueue';
import {
  getSysInvocationListColumns,
  quoteSqlString,
  targetServiceKeyClause,
  type QueryContext,
} from './shared';
import {
  parseStructuredStringFilters,
  structuredStringFilterClause,
} from './structuredStringFilters';

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
type WorkflowRunStatsResponse =
  components['schemas']['WorkflowRunStatsResponse'];

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

function workflowScopeClause(
  context: QueryContext,
  scope?: string,
  column = 'scope',
) {
  if (!context.features.has('vqueues')) return '';
  return scope === undefined
    ? `\n      AND ${column} IS NULL`
    : `\n      AND ${column} = ${quoteSqlString(scope)}`;
}

async function findWorkflowRunInvocationId(
  context: QueryContext,
  service: string,
  workflowId: string,
  runHandler: string,
  scope?: string,
) {
  const scopeClause = workflowScopeClause(context, scope);
  const { rows } = await context.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND ${targetServiceKeyClause(context, workflowId)}
      AND target_handler_name = ${quoteSqlString(runHandler)}${scopeClause}
    LIMIT 1`,
  );
  const invocationId = rows.at(0)?.['id'];
  return invocationId == null ? undefined : String(invocationId);
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
  const parsedFilters = parseStructuredStringFilters(
    args.filters,
    this.features.has('vqueues') ? ['id', 'scope'] : ['id'],
  );
  if (parsedFilters.error) {
    return new Response(parsedFilters.error, { status: 400 });
  }
  const hasIdFilter = parsedFilters.filters.some(({ field }) => field === 'id');
  const nonNullIdClause = hasIdFilter
    ? ''
    : '\n      AND target_service_key IS NOT NULL';
  const filterClause = structuredStringFilterClause(parsedFilters.filters, {
    id: 'target_service_key',
    scope: 'scope',
  });
  const { rows: candidateRows } = await this.query(
    `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'workflow'
      AND target_handler_name = ${quoteSqlString(handlers.run)}${nonNullIdClause}${searchClause}${filterClause}
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
  const runPromise = findWorkflowRunInvocationId(
    this,
    service,
    workflowId,
    handlers.run,
    scope,
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
  const [runId, recentResult] = await Promise.all([runPromise, recentPromise]);
  const recentInvocationsTruncated =
    recentResult.rows.length > RECENT_INVOCATION_LIMIT;
  const recentIds = recentResult.rows
    .slice(0, RECENT_INVOCATION_LIMIT)
    .map((row) => String(row['id']));
  const invocationsById = await hydrateInvocations(
    this,
    [...(runId ? [runId] : []), ...recentIds],
    new Date().toISOString(),
  );
  const runInvocation = runId ? invocationsById.get(runId) : undefined;
  const recentInvocations = recentIds.flatMap((id) => {
    const invocation = invocationsById.get(id);
    return invocation ? [invocation] : [];
  });
  if (!runInvocation && recentInvocations.length === 0) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }

  return Response.json({
    ...(runInvocation ? { runInvocation } : {}),
    recentInvocations,
    recentInvocationsLimit: RECENT_INVOCATION_LIMIT,
    recentInvocationsTruncated,
  } satisfies WorkflowRunDetailsResponse);
}

export async function getWorkflowRunStats(
  this: QueryContext,
  service: string,
  workflowId: string,
  scope?: string,
  invocationId?: string,
) {
  if (!this.features.has('vqueues')) {
    return Response.json({
      supported: false,
    } satisfies WorkflowRunStatsResponse);
  }

  const handlers = await getWorkflowHandlers(this, service);
  if (!handlers) {
    return notFound(`${service} is not a Workflow service.`);
  }

  const runInvocationId =
    invocationId ||
    (await findWorkflowRunInvocationId(
      this,
      service,
      workflowId,
      handlers.run,
      scope,
    ));
  if (!runInvocationId) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }

  const invocationScopeClause = workflowScopeClause(this, scope, 'si.scope');
  const identityScopeClause = workflowScopeClause(this, scope);
  const [runResult, promisesResult, interactionResult, stateResult] =
    await Promise.all([
      this.query(
        `SELECT
      stage,
      transitioned_at,
      first_attempt_at,
      first_runnable_at
    FROM sys_vqueue_entry_status
    WHERE entry_id = ${quoteSqlString(runInvocationId)}
      AND entry_kind = 'invocation'
    LIMIT 1`,
      ),
      this.query(
        `SELECT COUNT(*) AS pending_promise_count
    FROM sys_promise
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(workflowId)}${identityScopeClause}
      AND completed = false`,
      ),
      this.query(
        `SELECT MAX(si.created_at) AS last_interaction_at
    FROM sys_invocation_status si
    WHERE si.target_service_name = ${quoteSqlString(service)}
      AND si.target_service_ty = 'workflow'
      AND ${targetServiceKeyClause(this, workflowId, 'si.target_service_key')}
      AND si.target_handler_name <> ${quoteSqlString(handlers.run)}${invocationScopeClause}`,
      ),
      this.query(
        `SELECT
      COUNT(*) AS num_keys,
      COALESCE(SUM(value_length), 0) AS total_size
    FROM state
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(workflowId)}${identityScopeClause}`,
      ),
    ]);

  const runRow = runResult.rows.at(0) as Record<string, unknown> | undefined;
  if (!runRow) {
    return notFound(`Workflow run ${service}/${workflowId} was not found.`);
  }

  const promisesRow = promisesResult.rows.at(0) ?? {};
  const interactionRow = interactionResult.rows.at(0) ?? {};
  const stateRow = stateResult.rows.at(0) ?? {};
  const pendingPromiseCount = Number(promisesRow['pending_promise_count']);
  const numStateKeys = Number(stateRow['num_keys']);
  const totalStateSize = Number(stateRow['total_size']);
  const lastInteractionAt = interactionRow['last_interaction_at'];
  const stage =
    typeof runRow['stage'] === 'string' ? runRow['stage'] : undefined;
  const transitionedAt =
    typeof runRow['transitioned_at'] === 'string'
      ? runRow['transitioned_at']
      : undefined;
  const firstAttemptAt =
    typeof runRow['first_attempt_at'] === 'string'
      ? runRow['first_attempt_at']
      : undefined;
  const firstRunnableAt =
    typeof runRow['first_runnable_at'] === 'string'
      ? runRow['first_runnable_at']
      : undefined;
  const requestTime = new Date().toISOString();
  const duration = firstAttemptAt
    ? durationBetween(
        firstAttemptAt,
        stage === 'finished' ? (transitionedAt ?? requestTime) : requestTime,
      )
    : undefined;
  const queueDuration =
    firstRunnableAt && firstAttemptAt
      ? durationBetween(firstRunnableAt, firstAttemptAt)
      : undefined;
  const waitingToStartDuration =
    !firstAttemptAt &&
    firstRunnableAt &&
    Date.parse(firstRunnableAt) <= Date.parse(requestTime)
      ? durationBetween(firstRunnableAt, requestTime)
      : undefined;

  return Response.json({
    supported: true,
    ...(duration ? { duration } : {}),
    ...(queueDuration ? { queueDuration } : {}),
    ...(waitingToStartDuration ? { waitingToStartDuration } : {}),
    pendingPromiseCount:
      Number.isSafeInteger(pendingPromiseCount) && pendingPromiseCount >= 0
        ? pendingPromiseCount
        : 0,
    ...(lastInteractionAt == null
      ? {}
      : { lastInteractionAt: String(lastInteractionAt) }),
    state: {
      numKeys:
        Number.isSafeInteger(numStateKeys) && numStateKeys >= 0
          ? numStateKeys
          : 0,
      totalSize:
        Number.isSafeInteger(totalStateSize) && totalStateSize >= 0
          ? totalStateSize
          : 0,
    },
  } satisfies WorkflowRunStatsResponse);
}
