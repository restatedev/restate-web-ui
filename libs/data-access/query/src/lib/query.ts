import { HTTPError, TimeoutError } from 'ky';
import type {
  FilterItem,
  BatchInvocationsRequestBody,
  components,
  VqueueEntryStage,
} from '@restate/data-access/admin-api-spec';
import { RestateError } from '@restate/util/errors';
import {
  createRouter,
  createRoutes,
  createStorageKey,
  type Middleware,
} from '@remix-run/fetch-router';
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
  getInbox,
  getState,
  getStateInterface,
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
  type StateServiceType,
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
} from './handlers';
import { getVersion } from './getVersion';
import { getFeatures } from './getFeatures';

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
  getInvocationJournalV2: (
    invocationId: string,
    includePayloads?: boolean,
  ) => Promise<Response>;
  getInbox: (
    service: string,
    key: string,
    invocationId: string | undefined,
    scope?: string,
  ) => Promise<Response>;
  getState: (
    service: string,
    key: string,
    serviceType?: StateServiceType,
    stateKeys?: string[],
  ) => Promise<Response>;
  getStateInterface: (
    service: string,
    serviceKey?: string[],
    scope?: string,
    serviceType?: StateServiceType,
  ) => Promise<Response>;
  queryState: (
    service: string,
    args: { systemFilters?: FilterItem[]; stateFilter?: FilterItem },
    serviceType?: StateServiceType,
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
    getInbox: getInbox.bind(context),
    getState: (service, key, serviceType, stateKeys) =>
      getState.call(context, service, key, undefined, serviceType, stateKeys),
    getStateInterface: (service, serviceKey, scope, serviceType) =>
      getStateInterface.call(context, service, serviceKey, scope, serviceType),
    queryState: (service, args, serviceType) =>
      queryState.call(context, service, args, serviceType),
    listState: (service, args) => listState.call(context, service, args),
    listStateEntries: (service, key, args) =>
      listStateEntries.call(context, service, key, args),
    getScopedState: (service, scope, key, stateKeys) =>
      getState.call(context, service, key, scope, undefined, stateKeys),
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

const handlersKey = createStorageKey<BoundHandlers>();

function readServiceType(
  searchParams: URLSearchParams,
): StateServiceType | undefined {
  const raw = searchParams.get('serviceType');
  if (raw === 'virtual_object' || raw === 'workflow' || raw === 'service') {
    return raw;
  }
  return undefined;
}

const decodeParamsMiddleware: Middleware = (ctx, next) => {
  const params = ctx.params as Record<string, string | undefined>;
  for (const key in params) {
    const value = params[key];
    if (value !== undefined) {
      params[key] = decodeURIComponent(value);
    }
  }
  return next();
};

const handlersMiddleware: Middleware = (ctx, next) => {
  const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
  const restateVersion = getVersion(ctx.headers);
  const features = getFeatures(ctx.headers);
  const queryContext = createQueryContext(
    baseUrl,
    ctx.headers,
    restateVersion,
    features,
    ctx.request.signal,
  );
  const handlers = bindHandlers(queryContext);
  ctx.storage.set(handlersKey, handlers);
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
    queue: {
      method: 'GET',
      pattern: '/virtualObjects/:name/keys/:key/queue',
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
      keys: { method: 'GET', pattern: '/services/:name/state/keys' },
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

router.map(routes, {
  middleware: [decodeParamsMiddleware],
  actions: {
    invocations: {
      async statuses(ctx) {
        const { getInvocationsStatus } = ctx.storage.get(handlersKey);
        const {
          invocationIds = [],
        }: components['schemas']['GetInvocationsStatusRequestBody'] =
          await ctx.request.json();
        return getInvocationsStatus(invocationIds);
      },
      async get(ctx) {
        const { getInvocation } = ctx.storage.get(handlersKey);
        return getInvocation(ctx.params.invocationId);
      },
      async journalEntryPayloads(ctx) {
        const { getJournalEntryPayloads } = ctx.storage.get(handlersKey);
        return getJournalEntryPayloads(
          ctx.params.invocationId,
          Number(ctx.params.entryIndex),
        );
      },
      async journalEntryMetadata(ctx) {
        const { getJournalEntryMetadata } = ctx.storage.get(handlersKey);
        return getJournalEntryMetadata(
          ctx.params.invocationId,
          Number(ctx.params.entryIndex),
        );
      },
      async cancel(ctx) {
        const { batchCancelInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchCancelInvocations(request);
      },
      async purge(ctx) {
        const { batchPurgeInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchPurgeInvocations(request);
      },
      async kill(ctx) {
        const { batchKillInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchKillInvocations(request);
      },
      async pause(ctx) {
        const { batchPauseInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchPauseInvocations(request);
      },
      async resume(ctx) {
        const { batchResumeInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchResumeInvocations(request);
      },
      async restartAsNew(ctx) {
        const { batchRestartAsNewInvocations } = ctx.storage.get(handlersKey);
        const request: BatchInvocationsRequestBody = await ctx.request.json();
        return batchRestartAsNewInvocations(request);
      },
      async pausedError(ctx) {
        const { getPausedError } = ctx.storage.get(handlersKey);
        return getPausedError(ctx.params.invocationId);
      },
      async transientError(ctx) {
        const { getTransientError } = ctx.storage.get(handlersKey);
        return getTransientError(ctx.params.invocationId);
      },
      async vqueue(ctx) {
        const { getVqueue } = ctx.storage.get(handlersKey);
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
        const { getVqueueEntries } = ctx.storage.get(handlersKey);
        return getVqueueEntries(ctx.params.vqueueId, stage);
      },
    },
    invocationsV2: {
      async list(ctx) {
        const { listInvocationsV2 } = ctx.storage.get(handlersKey);
        const body = (await ctx.request.json()) as ListInvocationsV2Args;
        return listInvocationsV2(body);
      },
      async summary(ctx) {
        const { summaryInvocationsV2 } = ctx.storage.get(handlersKey);
        const body = (await ctx.request.json()) as SummaryInvocationsV2Args;
        return summaryInvocationsV2(body);
      },
      async inbox(ctx) {
        const { inboxInvocationsBreakdownV2 } = ctx.storage.get(handlersKey);
        const body =
          (await ctx.request.json()) as InboxInvocationsBreakdownV2Args;
        return inboxInvocationsBreakdownV2(body);
      },
      async finishedBreakdown(ctx) {
        const { finishedInvocationsBreakdownV2 } = ctx.storage.get(handlersKey);
        const body =
          (await ctx.request.json()) as FinishedInvocationsBreakdownV2Args;
        return finishedInvocationsBreakdownV2(body);
      },
      async get(ctx) {
        const { getInvocationJournalV2 } = ctx.storage.get(handlersKey);
        const includePayloads =
          ctx.url.searchParams.get('includePayloads') === 'true';
        return getInvocationJournalV2(ctx.params.invocationId, includePayloads);
      },
    },
    virtualObjects: {
      async instances(ctx) {
        const { listVirtualObjectInstances } = ctx.storage.get(handlersKey);
        const body =
          (await ctx.request.json()) as ListVirtualObjectInstancesArgs;
        return listVirtualObjectInstances(ctx.params.service, body);
      },
      async lock(ctx) {
        const { getVirtualObjectLock } = ctx.storage.get(handlersKey);
        return getVirtualObjectLock(
          ctx.params.service,
          ctx.params.key,
          ctx.url.searchParams.has('scope')
            ? String(ctx.url.searchParams.get('scope'))
            : undefined,
        );
      },
      async inbox(ctx) {
        const { getVirtualObjectInbox } = ctx.storage.get(handlersKey);
        return getVirtualObjectInbox(
          ctx.params.service,
          ctx.params.key,
          ctx.url.searchParams.has('scope')
            ? String(ctx.url.searchParams.get('scope'))
            : undefined,
        );
      },
      async invocations(ctx) {
        const { getVirtualObjectInvocations } = ctx.storage.get(handlersKey);
        return getVirtualObjectInvocations(
          ctx.params.service,
          ctx.params.key,
          ctx.url.searchParams.has('scope')
            ? String(ctx.url.searchParams.get('scope'))
            : undefined,
        );
      },
      async stats(ctx) {
        const { getVirtualObjectStats } = ctx.storage.get(handlersKey);
        return getVirtualObjectStats(
          ctx.params.service,
          ctx.params.key,
          ctx.url.searchParams.has('scope')
            ? String(ctx.url.searchParams.get('scope'))
            : undefined,
        );
      },
      async queue(ctx) {
        const { getInbox } = ctx.storage.get(handlersKey);
        return getInbox(
          ctx.params.name,
          ctx.params.key,
          ctx.url.searchParams.has('invocationId')
            ? String(ctx.url.searchParams.get('invocationId'))
            : undefined,
          ctx.url.searchParams.get('scope') ?? undefined,
        );
      },
    },
    workflows: {
      runs: {
        async list(ctx) {
          const { listWorkflowRuns } = ctx.storage.get(handlersKey);
          const body = (await ctx.request.json()) as ListWorkflowRunsArgs;
          return listWorkflowRuns(ctx.params.service, body);
        },
        async get(ctx) {
          const { getWorkflowRun } = ctx.storage.get(handlersKey);
          return getWorkflowRun(
            ctx.params.service,
            ctx.params.workflowId,
            ctx.url.searchParams.has('scope')
              ? String(ctx.url.searchParams.get('scope'))
              : undefined,
          );
        },
        async stats(ctx) {
          const { getWorkflowRunStats } = ctx.storage.get(handlersKey);
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
    },
    services: {
      state: {
        async get(ctx) {
          const { getState } = ctx.storage.get(handlersKey);
          return getState(
            ctx.params.name,
            ctx.params.key,
            readServiceType(ctx.url.searchParams),
            ctx.url.searchParams.getAll('stateKey'),
          );
        },
        async keys(ctx) {
          const { getStateInterface } = ctx.storage.get(handlersKey);
          return getStateInterface(
            ctx.params.name,
            ctx.url.searchParams.getAll('serviceKey'),
            ctx.url.searchParams.get('scope') ?? undefined,
            readServiceType(ctx.url.searchParams),
          );
        },
        async query(ctx) {
          const { queryState } = ctx.storage.get(handlersKey);
          const args = (await ctx.request.json()) as {
            systemFilters?: FilterItem[];
            stateFilter?: FilterItem;
          };
          return queryState(
            ctx.params.name,
            args,
            readServiceType(ctx.url.searchParams),
          );
        },
        async list(ctx) {
          const { listState } = ctx.storage.get(handlersKey);
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
          const { listStateEntries } = ctx.storage.get(handlersKey);
          const body = (await ctx.request.json()) as ListStateEntriesArgs;
          return listStateEntries(ctx.params.name, ctx.params.key, body);
        },
      },
      scopedState: {
        async get(ctx) {
          const { getScopedState } = ctx.storage.get(handlersKey);
          return getScopedState(
            ctx.params.name,
            ctx.params.scope,
            ctx.params.key,
            ctx.url.searchParams.getAll('stateKey'),
          );
        },
      },
    },
    deployments: {
      async drained(ctx) {
        const { listDrainedDeployments } = ctx.storage.get(handlersKey);
        return listDrainedDeployments();
      },
    },
    state: {
      async storageSize(ctx) {
        const { getStateStorageSize } = ctx.storage.get(handlersKey);
        return getStateStorageSize();
      },
    },
    limits: {
      rules: {
        async list(ctx) {
          const { listLimitRules } = ctx.storage.get(handlersKey);
          const args: components['schemas']['ListLimitRulesRequestBody'] =
            await ctx.request.json();
          return listLimitRules(args);
        },
      },
      async userLimits(ctx) {
        const { listUserLimits } = ctx.storage.get(handlersKey);
        const args: components['schemas']['ListLimitCountersRequestBody'] =
          await ctx.request.json();
        return listUserLimits(args);
      },
      async vqueues(ctx) {
        const { listVqueues } = ctx.storage.get(handlersKey);
        const args: components['schemas']['ListVQueuesRequestBody'] =
          await ctx.request.json();
        return listVqueues(args);
      },
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
