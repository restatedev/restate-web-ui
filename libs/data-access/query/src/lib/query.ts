import { HTTPError } from 'ky';
import type {
  FilterItem,
  BatchInvocationsRequestBody,
  components,
} from '@restate/data-access/admin-api/spec';
import { RestateError } from '@restate/util/errors';
import {
  createRouter,
  createRoutes,
  createStorageKey,
  Middleware,
} from '@remix-run/fetch-router';
import {
  type QueryContext,
  createQueryContext,
  listInvocations,
  getInvocation,
  getInvocationJournal,
  getJournalEntryV2,
  getInvocationJournalV2,
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
} from './handlers';
import { getVersion } from './getVersion';

type BoundHandlers = {
  listInvocations: (
    filters: FilterItem[],
    sort?: components['schemas']['ListInvocationsRequestBody']['sort'],
  ) => Promise<Response>;
  countInvocations: (filters: FilterItem[]) => Promise<Response>;
  getInvocation: (invocationId: string) => Promise<Response>;
  getInvocationJournal: (invocationId: string) => Promise<Response>;
  getJournalEntryV2: (
    invocationId: string,
    entryIndex: number,
  ) => Promise<Response>;
  getInvocationJournalV2: (invocationId: string) => Promise<Response>;
  getInbox: (
    service: string,
    key: string,
    invocationId: string | undefined,
  ) => Promise<Response>;
  getState: (service: string, key: string) => Promise<Response>;
  getStateInterface: (service: string) => Promise<Response>;
  queryState: (service: string, filters: FilterItem[]) => Promise<Response>;
  listState: (service: string, keys: string[]) => Promise<Response>;
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
};

function bindHandlers(context: QueryContext): BoundHandlers {
  return {
    countInvocations: countInvocations.bind(context),
    listInvocations: listInvocations.bind(context),
    getInvocation: getInvocation.bind(context),
    getInvocationJournal: getInvocationJournal.bind(context),
    getJournalEntryV2: getJournalEntryV2.bind(context),
    getInvocationJournalV2: getInvocationJournalV2.bind(context),
    getInbox: getInbox.bind(context),
    getState: getState.bind(context),
    getStateInterface: getStateInterface.bind(context),
    queryState: queryState.bind(context),
    listState: listState.bind(context),
    batchCancelInvocations: batchCancelInvocations.bind(context),
    batchPurgeInvocations: batchPurgeInvocations.bind(context),
    batchKillInvocations: batchKillInvocations.bind(context),
    batchPauseInvocations: batchPauseInvocations.bind(context),
    batchResumeInvocations: batchResumeInvocations.bind(context),
    batchRestartAsNewInvocations: batchRestartAsNewInvocations.bind(context),
  };
}

const handlersKey = createStorageKey<BoundHandlers>();

const handlersMiddleware: Middleware = (ctx, next) => {
  const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
  const restateVersion = getVersion(ctx.headers);
  const queryContext = createQueryContext(baseUrl, ctx.headers, restateVersion);
  const handlers = bindHandlers(queryContext);
  ctx.storage.set(handlersKey, handlers);
  return next();
};

async function extractErrorPayload(res: Response): Promise<string | undefined> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return ((await res.json()) as { message?: string })?.message;
    } catch {
      // fall back if server lied
    }
  }
  return (await res.text()) as string;
}

const routes = createRoutes({
  invocations: {
    list: { method: 'POST', pattern: '/invocations' },
    count: { method: 'POST', pattern: '/invocations/count' },
    get: { method: 'GET', pattern: '/invocations/:invocationId' },
    journalEntry: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex',
    },
    journal: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal',
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
  },
});

const queryRouter = createRouter();

queryRouter.use(handlersMiddleware);

queryRouter.map(routes, {
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
    async journal(ctx) {
      const { getInvocationJournal } = ctx.storage.get(handlersKey);
      return getInvocationJournal(ctx.params.invocationId);
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
  },
  invocationsV2: {
    async get(ctx) {
      const { getInvocationJournalV2 } = ctx.storage.get(handlersKey);
      return getInvocationJournalV2(ctx.params.invocationId);
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
      );
    },
  },
  services: {
    state: {
      async get(ctx) {
        const { getState } = ctx.storage.get(handlersKey);
        return getState(ctx.params.name, ctx.params.key);
      },
      async keys(ctx) {
        const { getStateInterface } = ctx.storage.get(handlersKey);
        return getStateInterface(ctx.params.name);
      },
      async query(ctx) {
        const { queryState } = ctx.storage.get(handlersKey);
        const { filters = [] }: { filters: FilterItem[] } =
          await ctx.request.json();
        return queryState(ctx.params.name, filters);
      },
      async list(ctx) {
        const { listState } = ctx.storage.get(handlersKey);
        const { keys = [] }: { keys: string[] } = await ctx.request.json();
        return listState(ctx.params.name, keys);
      },
    },
  },
});

const router = createRouter({
  defaultHandler: () => new Response('Not implemented', { status: 501 }),
});

router.mount('/query', queryRouter);

async function queryHandler(req: Request) {
  const response = await router.dispatch(req);
  return response ?? new Response('Not implemented', { status: 501 });
}

export async function query(req: Request) {
  return queryHandler(req).catch(async (error) => {
    if (error instanceof HTTPError) {
      const body = await extractErrorPayload(error.response);
      return new Response(
        JSON.stringify(new RestateError(body || 'Oops something went wrong!')),
        {
          status: error.response.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else {
      console.log('/query call failed!', error);
      return new Response(
        JSON.stringify(new RestateError('Oops something went wrong!')),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  });
}
