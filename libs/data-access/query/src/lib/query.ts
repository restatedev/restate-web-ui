import { HTTPError, TimeoutError } from 'ky';
import type {
  FilterItem,
  BatchInvocationsRequestBody,
  components,
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
  listInvocations,
  getInvocation,
  getJournalEntryV2,
  getInvocationJournalV2,
  getJournalEntryPayloads,
  getInbox,
  getState,
  getStateInterface,
  queryState,
  listState,
  batchCancelInvocations,
  batchPurgeInvocations,
  batchKillInvocations,
  batchPauseInvocations,
  batchResumeInvocations,
  batchRestartAsNewInvocations,
  countInvocations,
  getInvocationsStatus,
  getMetrics,
  getStateStorageSize,
  listStateServices,
  summaryInvocations,
  completedInvocationsBreakdown,
  type CompletedInvocationsBreakdownArgs,
  getPausedError,
  getTransientError,
  listDrainedDeployments,
  type ListStateArgs,
  type ListStateItem,
  type StateServiceType,
} from './handlers';
import { getVersion } from './getVersion';
import { getFeatures } from './getFeatures';

type BoundHandlers = {
  listInvocations: (
    filters: FilterItem[],
    sort?: components['schemas']['ListInvocationsRequestBody']['sort'],
  ) => Promise<Response>;
  countInvocations: (filters: FilterItem[]) => Promise<Response>;
  summaryInvocations: (
    filters: FilterItem[],
    sampled?: boolean,
    sampleSize?: number,
    range?: string,
    excludeCompleted?: boolean,
  ) => Promise<Response>;
  completedInvocationsBreakdown: (
    args: CompletedInvocationsBreakdownArgs,
  ) => Promise<Response>;
  getInvocationsStatus: (invocationIds: string[]) => Promise<Response>;
  getMetrics: () => Promise<Response>;
  getStateStorageSize: () => Promise<Response>;
  listStateServices: () => Promise<Response>;
  getInvocation: (invocationId: string) => Promise<Response>;
  getJournalEntryV2: (
    invocationId: string,
    entryIndex: number,
  ) => Promise<Response>;
  getJournalEntryPayloads: (
    invocationId: string,
    entryIndex: number,
  ) => Promise<Response>;
  getInvocationJournalV2: (
    invocationId: string,
    includePayloads?: boolean,
    vqueueId?: string,
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
  listState: (
    service: string,
    args: ListStateArgs,
    serviceType?: StateServiceType,
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
  listDrainedDeployments: () => Promise<Response>;
};

function bindHandlers(context: QueryContext): BoundHandlers {
  return {
    countInvocations: countInvocations.bind(context),
    summaryInvocations: summaryInvocations.bind(context),
    completedInvocationsBreakdown: completedInvocationsBreakdown.bind(context),
    getInvocationsStatus: getInvocationsStatus.bind(context),
    getMetrics: getMetrics.bind(context),
    getStateStorageSize: getStateStorageSize.bind(context),
    listStateServices: listStateServices.bind(context),
    listInvocations: listInvocations.bind(context),
    getInvocation: getInvocation.bind(context),
    getJournalEntryV2: getJournalEntryV2.bind(context),
    getJournalEntryPayloads: getJournalEntryPayloads.bind(context),
    getInvocationJournalV2: getInvocationJournalV2.bind(context),
    getInbox: getInbox.bind(context),
    getState: (service, key, serviceType, stateKeys) =>
      getState.call(context, service, key, undefined, serviceType, stateKeys),
    getStateInterface: (service, serviceKey, scope, serviceType) =>
      getStateInterface.call(context, service, serviceKey, scope, serviceType),
    queryState: (service, args, serviceType) =>
      queryState.call(context, service, args, serviceType),
    listState: (service, args, serviceType) =>
      listState.call(context, service, args, serviceType),
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
    listDrainedDeployments: listDrainedDeployments.bind(context),
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
    if (params[key] !== undefined) {
      params[key] = decodeURIComponent(params[key]!);
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
    list: { method: 'POST', pattern: '/invocations' },
    count: { method: 'POST', pattern: '/invocations/count' },
    summary: { method: 'POST', pattern: '/invocations/summary' },
    completedBreakdown: {
      method: 'POST',
      pattern: '/invocations/completed-breakdown',
    },
    statuses: { method: 'POST', pattern: '/invocations/statuses' },
    get: { method: 'GET', pattern: '/invocations/:invocationId' },
    journalEntry: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex',
    },
    journalEntryPayloads: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex/payloads',
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
  },
  invocationsV2: {
    get: { method: 'GET', pattern: '/v2/invocations/:invocationId' },
  },
  virtualObjects: {
    queue: {
      method: 'GET',
      pattern: '/virtualObjects/:name/keys/:key/queue',
    },
  },
  services: {
    state: {
      get: { method: 'GET', pattern: '/services/:name/keys/:key/state' },
      keys: { method: 'GET', pattern: '/services/:name/state/keys' },
      query: { method: 'POST', pattern: '/services/:name/state/query' },
      list: { method: 'POST', pattern: '/services/:name/state' },
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
  metrics: {
    get: { method: 'GET', pattern: '/metrics' },
  },
  state: {
    services: { method: 'GET', pattern: '/state/services' },
    storageSize: { method: 'GET', pattern: '/state/storage-size' },
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
      async list(ctx) {
        const { listInvocations } = ctx.storage.get(handlersKey);
        const {
          filters = [],
          sort,
        }: components['schemas']['ListInvocationsRequestBody'] =
          await ctx.request.json();
        return listInvocations(filters, sort);
      },
      async count(ctx) {
        const { countInvocations } = ctx.storage.get(handlersKey);
        const { filters = [] }: { filters: FilterItem[] } =
          await ctx.request.json();
        return countInvocations(filters);
      },
      async summary(ctx) {
        const { summaryInvocations } = ctx.storage.get(handlersKey);
        const {
          filters = [],
          sampled,
          sampleSize,
          range,
          excludeCompleted,
        }: {
          filters: FilterItem[];
          sampled?: boolean;
          sampleSize?: number;
          range?: string;
          excludeCompleted?: boolean;
        } = await ctx.request.json();
        return summaryInvocations(
          filters,
          sampled,
          sampleSize,
          range,
          excludeCompleted,
        );
      },
      async completedBreakdown(ctx) {
        const { completedInvocationsBreakdown } = ctx.storage.get(handlersKey);
        const body =
          (await ctx.request.json()) as CompletedInvocationsBreakdownArgs;
        return completedInvocationsBreakdown(body);
      },
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
      async journalEntry(ctx) {
        const { getJournalEntryV2 } = ctx.storage.get(handlersKey);
        return getJournalEntryV2(
          ctx.params.invocationId,
          Number(ctx.params.entryIndex),
        );
      },
      async journalEntryPayloads(ctx) {
        const { getJournalEntryPayloads } = ctx.storage.get(handlersKey);
        return getJournalEntryPayloads(
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
    },
    invocationsV2: {
      async get(ctx) {
        const { getInvocationJournalV2 } = ctx.storage.get(handlersKey);
        const includePayloads =
          ctx.url.searchParams.get('includePayloads') === 'true';
        const vqueueId = ctx.url.searchParams.get('vqueueId') ?? undefined;
        return getInvocationJournalV2(
          ctx.params.invocationId,
          includePayloads,
          vqueueId,
        );
      },
    },
    virtualObjects: {
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
          return listState(
            ctx.params.name,
            args,
            readServiceType(ctx.url.searchParams),
          );
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
    metrics: {
      async get(ctx) {
        const { getMetrics } = ctx.storage.get(handlersKey);
        return getMetrics();
      },
    },
    state: {
      async services(ctx) {
        const { listStateServices } = ctx.storage.get(handlersKey);
        return listStateServices();
      },
      async storageSize(ctx) {
        const { getStateStorageSize } = ctx.storage.get(handlersKey);
        return getStateStorageSize();
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
