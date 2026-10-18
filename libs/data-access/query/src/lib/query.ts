import { HTTPError, TimeoutError } from 'ky';
import type {
  FilterItem,
  BatchInvocationsRequestBody,
  components,
  VqueueEntryStage,
} from '@restate/data-access-admin-api-spec';
import { RestateError } from '@restate/util-errors';
import {
  createContextKey,
  createRouter,
  type Middleware,
} from '@remix-run/fetch-router';
import { createRoutes } from '@remix-run/fetch-router/routes';
import {
  QUERY_HANDLER_DOWNSTREAM_TIMEOUT_LABEL,
  type QueryContext,
  createQueryContext,
  listInvocationsV2,
  type ListInvocationsV2Args,
  summaryInvocationsV2,
  type SummaryInvocationsV2Args,
  inboxInvocationsBreakdownV2,
  type InboxInvocationsBreakdownV2Args,
  finishedInvocationsBreakdownV2,
  type FinishedInvocationsBreakdownV2Args,
  getInvocation,
  getInvocationJournalV2,
  getJournalEntryPayloads,
  getJournalEntryMetadata,
  getState,
  queryState,
  listState,
  listStateEntries,
  type ListStateEntriesArgs,
  batchCancelInvocations,
  batchPurgeInvocations,
  batchKillInvocations,
  batchPauseInvocations,
  batchResumeInvocations,
  batchRestartAsNewInvocations,
  getInvocationsStatus,
  getStateStorageSize,
  listLimitRules,
  listUserLimits,
  listVqueues,
  getPausedError,
  getTransientError,
  getVqueue,
  getVqueueEntries,
  isVqueueEntryStage,
  listDrainedDeployments,
  type ListStateArgs,
  type ListStateItem,
  listVirtualObjectInstances,
  type ListVirtualObjectInstancesArgs,
  getVirtualObjectLock,
  getVirtualObjectInbox,
  getVirtualObjectInvocations,
  getVirtualObjectStats,
  listWorkflowRuns,
  type ListWorkflowRunsArgs,
  getWorkflowRun,
  getWorkflowRunStats,
} from './handlers/index.js';
import { getFeatures } from './getFeatures.js';

type BoundHandlers = {
  listInvocationsV2: (args: ListInvocationsV2Args) => Promise<Response>;
  summaryInvocationsV2: (args: SummaryInvocationsV2Args) => Promise<Response>;
  inboxInvocationsBreakdownV2: (
    args: InboxInvocationsBreakdownV2Args,
  ) => Promise<Response>;
  finishedInvocationsBreakdownV2: (
    args: FinishedInvocationsBreakdownV2Args,
  ) => Promise<Response>;
  getInvocationsStatus: (invocationIds: string[]) => Promise<Response>;
  getStateStorageSize: () => Promise<Response>;
  listLimitRules: (
    args: components['schemas']['ListLimitRulesRequestBody'],
  ) => Promise<Response>;
  listUserLimits: (
    args: components['schemas']['ListLimitCountersRequestBody'],
  ) => Promise<Response>;
  listVqueues: (
    args: components['schemas']['ListVQueuesRequestBody'],
  ) => Promise<Response>;
  getInvocation: (invocationId: string) => Promise<Response>;
  getJournalEntryPayloads: (
    invocationId: string,
    entryIndex: number,
  ) => Promise<Response>;
  getJournalEntryMetadata: (
    invocationId: string,
    entryIndex: number,
  ) => Promise<Response>;
  getInvocationJournalV2: (invocationId: string) => Promise<Response>;
  getState: (
    service: string,
    key: string,
    stateKeys?: string[],
  ) => Promise<Response>;
  queryState: (
    service: string,
    args: { systemFilters?: FilterItem[]; stateFilter?: FilterItem },
  ) => Promise<Response>;
  listState: (service: string, args: ListStateArgs) => Promise<Response>;
  listStateEntries: (
    service: string,
    key: string,
    args: ListStateEntriesArgs,
  ) => Promise<Response>;
  getScopedState: (
    service: string,
    scope: string,
    key: string,
    stateKeys?: string[],
  ) => Promise<Response>;
  batchCancelInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  batchPurgeInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  batchKillInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  batchPauseInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  batchResumeInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  batchRestartAsNewInvocations: (
    request: BatchInvocationsRequestBody,
  ) => Promise<Response>;
  getPausedError: (invocationId: string) => Promise<Response>;
  getTransientError: (invocationId: string) => Promise<Response>;
  getVqueue: (vqueueId: string, focusEntryId?: string) => Promise<Response>;
  getVqueueEntries: (
    vqueueId: string,
    stage: VqueueEntryStage,
  ) => Promise<Response>;
  listDrainedDeployments: () => Promise<Response>;
  listVirtualObjectInstances: (
    service: string,
    args: ListVirtualObjectInstancesArgs,
  ) => Promise<Response>;
  getVirtualObjectLock: (
    service: string,
    key: string,
    scope?: string,
  ) => Promise<Response>;
  getVirtualObjectInbox: (
    service: string,
    key: string,
    scope?: string,
  ) => Promise<Response>;
  getVirtualObjectInvocations: (
    service: string,
    key: string,
    scope?: string,
  ) => Promise<Response>;
  getVirtualObjectStats: (
    service: string,
    key: string,
    scope?: string,
  ) => Promise<Response>;
  listWorkflowRuns: (
    service: string,
    args: ListWorkflowRunsArgs,
  ) => Promise<Response>;
  getWorkflowRun: (
    service: string,
    workflowId: string,
    scope?: string,
  ) => Promise<Response>;
  getWorkflowRunStats: (
    service: string,
    workflowId: string,
    scope?: string,
    invocationId?: string,
  ) => Promise<Response>;
};

function bindHandlers(context: QueryContext): BoundHandlers {
  return {
    listInvocationsV2: listInvocationsV2.bind(context),
    summaryInvocationsV2: summaryInvocationsV2.bind(context),
    inboxInvocationsBreakdownV2: inboxInvocationsBreakdownV2.bind(context),
    finishedInvocationsBreakdownV2:
      finishedInvocationsBreakdownV2.bind(context),
    getInvocationsStatus: getInvocationsStatus.bind(context),
    getStateStorageSize: getStateStorageSize.bind(context),
    listLimitRules: listLimitRules.bind(context),
    listUserLimits: listUserLimits.bind(context),
    listVqueues: listVqueues.bind(context),
    getInvocation: getInvocation.bind(context),
    getJournalEntryPayloads: getJournalEntryPayloads.bind(context),
    getJournalEntryMetadata: getJournalEntryMetadata.bind(context),
    getInvocationJournalV2: getInvocationJournalV2.bind(context),
    getState: (service, key, stateKeys) =>
      getState.call(context, service, key, undefined, stateKeys),
    queryState: (service, args) => queryState.call(context, service, args),
    listState: (service, args) => listState.call(context, service, args),
    listStateEntries: (service, key, args) =>
      listStateEntries.call(context, service, key, args),
    getScopedState: (service, scope, key, stateKeys) =>
      getState.call(context, service, key, scope, stateKeys),
    batchCancelInvocations: batchCancelInvocations.bind(context),
    batchPurgeInvocations: batchPurgeInvocations.bind(context),
    batchKillInvocations: batchKillInvocations.bind(context),
    batchPauseInvocations: batchPauseInvocations.bind(context),
    batchResumeInvocations: batchResumeInvocations.bind(context),
    batchRestartAsNewInvocations: batchRestartAsNewInvocations.bind(context),
    getPausedError: getPausedError.bind(context),
    getTransientError: getTransientError.bind(context),
    getVqueue: getVqueue.bind(context),
    getVqueueEntries: getVqueueEntries.bind(context),
    listDrainedDeployments: listDrainedDeployments.bind(context),
    listVirtualObjectInstances: listVirtualObjectInstances.bind(context),
    getVirtualObjectLock: getVirtualObjectLock.bind(context),
    getVirtualObjectInbox: getVirtualObjectInbox.bind(context),
    getVirtualObjectInvocations: getVirtualObjectInvocations.bind(context),
    getVirtualObjectStats: getVirtualObjectStats.bind(context),
    listWorkflowRuns: listWorkflowRuns.bind(context),
    getWorkflowRun: getWorkflowRun.bind(context),
    getWorkflowRunStats: getWorkflowRunStats.bind(context),
  };
}

const handlersKey = createContextKey<BoundHandlers>();

const handlersMiddleware: Middleware<{
  key: typeof handlersKey;
  value: BoundHandlers;
}> = (ctx, next) => {
  const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
  const features = getFeatures(ctx.headers);
  const queryContext = createQueryContext(
    baseUrl,
    ctx.headers,
    features,
    ctx.request.signal,
  );
  const handlers = bindHandlers(queryContext);
  ctx.set(handlersKey, handlers);
  return next();
};

async function extractErrorPayload(res: Response): Promise<string | undefined> {
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as unknown;
      if (typeof data === 'string') {
        return data.trim() || undefined;
      }
      if (data && typeof data === 'object') {
        const { message, error } = data as {
          message?: unknown;
          error?: unknown;
        };
        const nestedError =
          error && typeof error === 'object'
            ? (error as { message?: unknown }).message
            : error;
        const detail = message ?? nestedError;
        if (typeof detail === 'string' && detail.trim()) {
          return detail.trim();
        }
        // JSON we don't recognize — surface it raw rather than swallow it.
        return JSON.stringify(data);
      }
      return undefined;
    }
    return (await res.text()).trim() || undefined;
  } catch {
    // Body already consumed, or didn't match its declared content-type.
    return undefined;
  }
}

export const routes = createRoutes('/query', {
  invocations: {
    statuses: { method: 'POST', pattern: '/invocations/statuses' },
    get: { method: 'GET', pattern: '/invocations/:invocationId' },
    journalEntryPayloads: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex/payloads',
    },
    journalEntryMetadata: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex/metadata',
    },
    cancel: { method: 'POST', pattern: '/invocations/cancel' },
    purge: { method: 'POST', pattern: '/invocations/purge' },
    kill: { method: 'POST', pattern: '/invocations/kill' },
    pause: { method: 'POST', pattern: '/invocations/pause' },
    resume: { method: 'POST', pattern: '/invocations/resume' },
    restartAsNew: {
      method: 'POST',
      pattern: '/invocations/restart-as-new',
    },
    pausedError: {
      method: 'GET',
      pattern: '/invocations/:invocationId/paused-error',
    },
    transientError: {
      method: 'GET',
      pattern: '/invocations/:invocationId/transient-error',
    },
    vqueue: {
      method: 'GET',
      pattern: '/vqueues/:vqueueId',
    },
    vqueueEntries: {
      method: 'GET',
      pattern: '/vqueues/:vqueueId/entries',
    },
  },
  invocationsV2: {
    list: { method: 'POST', pattern: '/v2/invocations' },
    summary: { method: 'POST', pattern: '/v2/invocations/summary' },
    inbox: {
      method: 'POST',
      pattern: '/v2/invocations/inbox',
    },
    finishedBreakdown: {
      method: 'POST',
      pattern: '/v2/invocations/finished-breakdown',
    },
    get: { method: 'GET', pattern: '/v2/invocations/:invocationId' },
  },
  virtualObjects: {
    instances: {
      method: 'POST',
      pattern: '/virtual-objects/:service/instances',
    },
    lock: {
      method: 'GET',
      pattern: '/virtual-objects/:service/instances/:key/lock',
    },
    inbox: {
      method: 'GET',
      pattern: '/virtual-objects/:service/instances/:key/inbox',
    },
    invocations: {
      method: 'GET',
      pattern: '/virtual-objects/:service/instances/:key/invocations',
    },
    stats: {
      method: 'GET',
      pattern: '/virtual-objects/:service/instances/:key/stats',
    },
  },
  workflows: {
    runs: {
      list: { method: 'POST', pattern: '/workflows/:service/runs' },
      get: {
        method: 'GET',
        pattern: '/workflows/:service/runs/:workflowId',
      },
      stats: {
        method: 'GET',
        pattern: '/workflows/:service/runs/:workflowId/stats',
      },
    },
  },
  services: {
    state: {
      get: { method: 'GET', pattern: '/services/:name/keys/:key/state' },
      query: { method: 'POST', pattern: '/services/:name/state/query' },
      list: { method: 'POST', pattern: '/services/:name/state' },
      entries: {
        method: 'POST',
        pattern: '/services/:name/keys/:key/state/entries',
      },
    },
    scopedState: {
      get: {
        method: 'GET',
        pattern: '/services/:name/scopes/:scope/keys/:key/state',
      },
    },
  },
  deployments: {
    drained: { method: 'GET', pattern: '/deployments/drained' },
  },
  state: {
    storageSize: { method: 'GET', pattern: '/state/storage-size' },
  },
  limits: {
    rules: {
      list: { method: 'POST', pattern: '/limits/rules' },
    },
    userLimits: { method: 'POST', pattern: '/limits/user-limits' },
    vqueues: { method: 'POST', pattern: '/limits/vqueues' },
  },
});

const router = createRouter({
  defaultHandler: () => new Response('Not implemented', { status: 501 }),
  middleware: [handlersMiddleware],
});

router.map(routes.invocations, {
  actions: {
    async statuses(ctx) {
      const { getInvocationsStatus } = ctx.get(handlersKey);
      const {
        invocationIds = [],
      }: components['schemas']['GetInvocationsStatusRequestBody'] =
        await ctx.request.json();
      return getInvocationsStatus(invocationIds);
    },
    async get(ctx) {
      const { getInvocation } = ctx.get(handlersKey);
      return getInvocation(ctx.params.invocationId);
    },
    async journalEntryPayloads(ctx) {
      const { getJournalEntryPayloads } = ctx.get(handlersKey);
      return getJournalEntryPayloads(
        ctx.params.invocationId,
        Number(ctx.params.entryIndex),
      );
    },
    async journalEntryMetadata(ctx) {
      const { getJournalEntryMetadata } = ctx.get(handlersKey);
      return getJournalEntryMetadata(
        ctx.params.invocationId,
        Number(ctx.params.entryIndex),
      );
    },
    async cancel(ctx) {
      const { batchCancelInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchCancelInvocations(request);
    },
    async purge(ctx) {
      const { batchPurgeInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchPurgeInvocations(request);
    },
    async kill(ctx) {
      const { batchKillInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchKillInvocations(request);
    },
    async pause(ctx) {
      const { batchPauseInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchPauseInvocations(request);
    },
    async resume(ctx) {
      const { batchResumeInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchResumeInvocations(request);
    },
    async restartAsNew(ctx) {
      const { batchRestartAsNewInvocations } = ctx.get(handlersKey);
      const request: BatchInvocationsRequestBody = await ctx.request.json();
      return batchRestartAsNewInvocations(request);
    },
    async pausedError(ctx) {
      const { getPausedError } = ctx.get(handlersKey);
      return getPausedError(ctx.params.invocationId);
    },
    async transientError(ctx) {
      const { getTransientError } = ctx.get(handlersKey);
      return getTransientError(ctx.params.invocationId);
    },
    async vqueue(ctx) {
      const { getVqueue } = ctx.get(handlersKey);
      const focusEntryId =
        ctx.url.searchParams.get('focusEntryId') ?? undefined;
      return getVqueue(ctx.params.vqueueId, focusEntryId);
    },
    async vqueueEntries(ctx) {
      const stage = ctx.url.searchParams.get('stage');
      if (!isVqueueEntryStage(stage)) {
        return Response.json(
          { message: 'A valid VQueue stage is required.' },
          { status: 400 },
        );
      }
      const { getVqueueEntries } = ctx.get(handlersKey);
      return getVqueueEntries(ctx.params.vqueueId, stage);
    },
  },
});

router.map(routes.invocationsV2, {
  actions: {
    async list(ctx) {
      const { listInvocationsV2 } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as ListInvocationsV2Args;
      return listInvocationsV2(body);
    },
    async summary(ctx) {
      const { summaryInvocationsV2 } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as SummaryInvocationsV2Args;
      return summaryInvocationsV2(body);
    },
    async inbox(ctx) {
      const { inboxInvocationsBreakdownV2 } = ctx.get(handlersKey);
      const body =
        (await ctx.request.json()) as InboxInvocationsBreakdownV2Args;
      return inboxInvocationsBreakdownV2(body);
    },
    async finishedBreakdown(ctx) {
      const { finishedInvocationsBreakdownV2 } = ctx.get(handlersKey);
      const body =
        (await ctx.request.json()) as FinishedInvocationsBreakdownV2Args;
      return finishedInvocationsBreakdownV2(body);
    },
    async get(ctx) {
      const { getInvocationJournalV2 } = ctx.get(handlersKey);
      return getInvocationJournalV2(ctx.params.invocationId);
    },
  },
});

router.map(routes.virtualObjects, {
  actions: {
    async instances(ctx) {
      const { listVirtualObjectInstances } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as ListVirtualObjectInstancesArgs;
      return listVirtualObjectInstances(ctx.params.service, body);
    },
    async lock(ctx) {
      const { getVirtualObjectLock } = ctx.get(handlersKey);
      return getVirtualObjectLock(
        ctx.params.service,
        ctx.params.key,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
      );
    },
    async inbox(ctx) {
      const { getVirtualObjectInbox } = ctx.get(handlersKey);
      return getVirtualObjectInbox(
        ctx.params.service,
        ctx.params.key,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
      );
    },
    async invocations(ctx) {
      const { getVirtualObjectInvocations } = ctx.get(handlersKey);
      return getVirtualObjectInvocations(
        ctx.params.service,
        ctx.params.key,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
      );
    },
    async stats(ctx) {
      const { getVirtualObjectStats } = ctx.get(handlersKey);
      return getVirtualObjectStats(
        ctx.params.service,
        ctx.params.key,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
      );
    },
  },
});

router.map(routes.workflows.runs, {
  actions: {
    async list(ctx) {
      const { listWorkflowRuns } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as ListWorkflowRunsArgs;
      return listWorkflowRuns(ctx.params.service, body);
    },
    async get(ctx) {
      const { getWorkflowRun } = ctx.get(handlersKey);
      return getWorkflowRun(
        ctx.params.service,
        ctx.params.workflowId,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
      );
    },
    async stats(ctx) {
      const { getWorkflowRunStats } = ctx.get(handlersKey);
      return getWorkflowRunStats(
        ctx.params.service,
        ctx.params.workflowId,
        ctx.url.searchParams.has('scope')
          ? String(ctx.url.searchParams.get('scope'))
          : undefined,
        ctx.url.searchParams.get('invocationId') || undefined,
      );
    },
  },
});

router.map(routes.services.state, {
  actions: {
    async get(ctx) {
      const { getState } = ctx.get(handlersKey);
      return getState(
        ctx.params.name,
        ctx.params.key,
        ctx.url.searchParams.getAll('stateKey'),
      );
    },
    async query(ctx) {
      const { queryState } = ctx.get(handlersKey);
      const args = (await ctx.request.json()) as {
        systemFilters?: FilterItem[];
        stateFilter?: FilterItem;
      };
      return queryState(ctx.params.name, args);
    },
    async list(ctx) {
      const { listState } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as {
        items?: ListStateItem[];
        keys?: string[];
      };
      const args: ListStateArgs = body.items
        ? { items: body.items }
        : { keys: body.keys ?? [] };
      return listState(ctx.params.name, args);
    },
    async entries(ctx) {
      const { listStateEntries } = ctx.get(handlersKey);
      const body = (await ctx.request.json()) as ListStateEntriesArgs;
      return listStateEntries(ctx.params.name, ctx.params.key, body);
    },
  },
});

router.map(routes.services.scopedState, {
  actions: {
    async get(ctx) {
      const { getScopedState } = ctx.get(handlersKey);
      return getScopedState(
        ctx.params.name,
        ctx.params.scope,
        ctx.params.key,
        ctx.url.searchParams.getAll('stateKey'),
      );
    },
  },
});

router.map(routes.deployments, {
  actions: {
    async drained(ctx) {
      const { listDrainedDeployments } = ctx.get(handlersKey);
      return listDrainedDeployments();
    },
  },
});

router.map(routes.state, {
  actions: {
    async storageSize(ctx) {
      const { getStateStorageSize } = ctx.get(handlersKey);
      return getStateStorageSize();
    },
  },
});

router.map(routes.limits, {
  actions: {
    async userLimits(ctx) {
      const { listUserLimits } = ctx.get(handlersKey);
      const args: components['schemas']['ListLimitCountersRequestBody'] =
        await ctx.request.json();
      return listUserLimits(args);
    },
    async vqueues(ctx) {
      const { listVqueues } = ctx.get(handlersKey);
      const args: components['schemas']['ListVQueuesRequestBody'] =
        await ctx.request.json();
      return listVqueues(args);
    },
  },
});

router.map(routes.limits.rules, {
  actions: {
    async list(ctx) {
      const { listLimitRules } = ctx.get(handlersKey);
      const args: components['schemas']['ListLimitRulesRequestBody'] =
        await ctx.request.json();
      return listLimitRules(args);
    },
  },
});

async function queryHandler(req: Request) {
  return router.fetch(req);
}

export async function query(req: Request) {
  return queryHandler(req).catch(async (error) => {
    if (error instanceof HTTPError) {
      const { status } = error.response;
      const body = await extractErrorPayload(error.response);
      // ky's HTTPError message already reads
      // "Request failed with status code <status> <statusText>: <method> <url>",
      // which is a better fallback than anything we'd hand-roll.
      return new Response(
        JSON.stringify(
          new RestateError(
            body || error.message,
            undefined,
            undefined,
            undefined,
            status,
          ),
        ),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    } else if (error instanceof TimeoutError) {
      // ky's message is "Request timed out: <method> <url>"; add the threshold.
      const message = `${error.message} (after ${QUERY_HANDLER_DOWNSTREAM_TIMEOUT_LABEL})`;
      return new Response(
        JSON.stringify(
          new RestateError(message, undefined, undefined, undefined, 504),
        ),
        {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else {
      // Network failures are enriched with the real downstream call in the
      // fetchers (see withRequestContext); other errors carry their own message.
      const detail = error instanceof Error ? error.message?.trim() : undefined;
      return new Response(
        JSON.stringify(
          new RestateError(
            detail || 'Oops something went wrong!',
            undefined,
            undefined,
            undefined,
            500,
          ),
        ),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  });
}
