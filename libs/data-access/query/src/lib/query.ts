import { HTTPError } from 'ky';
import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { RestateError } from '@restate/util/errors';
import { createRouter, createRoutes } from '@remix-run/fetch-router';
import {
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
} from './handlers';

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

const routes = createRoutes({
  invocations: {
    list: { method: 'POST', pattern: '/invocations' },
    get: { method: 'GET', pattern: '/invocations/:invocationId' },
    journalEntry: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal/:entryIndex',
    },
    journal: {
      method: 'GET',
      pattern: '/invocations/:invocationId/journal',
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

queryRouter.map(routes, {
  invocations: {
    async list(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      const { filters = [] }: { filters: FilterItem[] } =
        await ctx.request.json();
      return listInvocations(baseUrl, ctx.headers, filters);
    },
    async get(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      return getInvocation(ctx.params.invocationId, baseUrl, ctx.headers);
    },
    async journalEntry(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      return getJournalEntryV2(
        ctx.params.invocationId,
        Number(ctx.params.entryIndex),
        baseUrl,
        ctx.headers,
      );
    },
    async journal(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      return getInvocationJournal(
        ctx.params.invocationId,
        baseUrl,
        ctx.headers,
      );
    },
  },
  invocationsV2: {
    async get(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      return getInvocationJournalV2(
        ctx.params.invocationId,
        baseUrl,
        ctx.headers,
      );
    },
  },
  virtualObjects: {
    async queue(ctx) {
      const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
      return getInbox(
        ctx.params.name,
        ctx.params.key,
        ctx.url.searchParams.has('invocationId')
          ? String(ctx.url.searchParams.get('invocationId'))
          : undefined,
        baseUrl,
        ctx.headers,
      );
    },
  },
  services: {
    state: {
      async get(ctx) {
        const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
        return getState(ctx.params.name, ctx.params.key, baseUrl, ctx.headers);
      },
      async keys(ctx) {
        const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
        return getStateInterface(ctx.params.name, baseUrl, ctx.headers);
      },
      async query(ctx) {
        const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
        const { filters = [] }: { filters: FilterItem[] } =
          await ctx.request.json();
        return queryState(ctx.params.name, baseUrl, ctx.headers, filters);
      },
      async list(ctx) {
        const baseUrl = `${ctx.url.protocol}//${ctx.url.host}`;
        const { keys = [] }: { keys: string[] } = await ctx.request.json();
        return listState(ctx.params.name, baseUrl, ctx.headers, keys);
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
