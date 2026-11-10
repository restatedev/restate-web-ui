import ky from 'ky';
import { describe, expect, it, vi } from 'vitest';
import { getState } from './handlers/index.js';
import { query } from './query.js';

vi.mock('./handlers/index.js', async (importOriginal) => {
  const echo = (handler: string) =>
    vi.fn((...args: unknown[]) => Response.json({ handler, args }));
  return {
    ...(await importOriginal<typeof import('./handlers/index.js')>()),
    getVirtualObjectLock: echo('getVirtualObjectLock'),
    getVirtualObjectStats: echo('getVirtualObjectStats'),
    getWorkflowRun: echo('getWorkflowRun'),
    getWorkflowRunStats: echo('getWorkflowRunStats'),
    getState: echo('getState'),
    listStateEntries: echo('listStateEntries'),
  };
});

const e = encodeURIComponent;

async function send(path: string, init?: RequestInit) {
  const response = await query(
    new Request(`http://localhost/query${path}`, init),
  );
  return { status: response.status, ...(await response.json()) };
}

describe('query routes with keys', () => {
  it.each([
    [
      'a Virtual Object lock',
      `/virtual-objects/Cart/instances/${e('v1.2.3')}/lock`,
      'getVirtualObjectLock',
      ['Cart', 'v1.2.3', null],
    ],
    [
      'a workflow run',
      `/workflows/SignupWorkflow/runs/${e('grace@example.com')}`,
      'getWorkflowRun',
      ['SignupWorkflow', 'grace@example.com', null],
    ],
    [
      'workflow run stats',
      `/workflows/SignupWorkflow/runs/${e('grace@example.com')}/stats`,
      'getWorkflowRunStats',
      ['SignupWorkflow', 'grace@example.com', null, null],
    ],
    [
      'state',
      `/services/Cart/keys/${e('a.b')}/state`,
      'getState',
      ['Cart', 'a.b', null, []],
    ],
    [
      'scoped state',
      `/services/Cart/scopes/${e('tenant.eu')}/keys/${e('a.b')}/state`,
      'getState',
      ['Cart', 'a.b', 'tenant.eu', []],
    ],
  ])('matches %s whose key contains dots', async (_, path, handler, args) => {
    expect(await send(path)).toEqual({ status: 200, handler, args });
  });

  it('keeps the body of a POST to a key route', async () => {
    expect(
      await send(`/services/Cart/keys/${e('a.b')}/state/entries`, {
        method: 'POST',
        body: JSON.stringify({ keys: ['items'] }),
      }),
    ).toEqual({
      status: 200,
      handler: 'listStateEntries',
      args: ['Cart', 'a.b', { keys: ['items'] }],
    });
  });

  it('opens a workflow run whose ID matches a sibling route', async () => {
    expect(await send('/workflows/SignupWorkflow/runs/stats')).toEqual({
      status: 200,
      handler: 'getWorkflowRun',
      args: ['SignupWorkflow', 'stats', null],
    });
  });

  it('keeps an encoded slash inside the key', async () => {
    expect(
      await send(`/virtual-objects/Cart/instances/${e('x/lock')}/stats`),
    ).toEqual({
      status: 200,
      handler: 'getVirtualObjectStats',
      args: ['Cart', 'x/lock', null],
    });
  });
});

describe('query errors', () => {
  it.each([
    [
      'a text body without a content type',
      () =>
        new Response(new TextEncoder().encode('Malformed environment id'), {
          status: 400,
        }),
      'Malformed environment id',
    ],
    [
      'a JSON body',
      () => Response.json({ message: 'table not found' }, { status: 404 }),
      'table not found',
    ],
  ])(
    'reports the status and message of a server error with %s',
    async (_, createResponse, message) => {
      const response = createResponse();
      vi.mocked(getState).mockImplementationOnce(() =>
        ky('http://localhost:9070/query', {
          fetch: async () => response,
          retry: 0,
        }).json<Response>(),
      );

      expect(await send(`/services/Cart/keys/a/state`)).toMatchObject({
        status: response.status,
        message,
      });
    },
  );

  it('says so when a server error has no message', async () => {
    vi.mocked(getState).mockImplementationOnce(() =>
      ky('http://localhost:9070/query', {
        fetch: async () => new Response(null, { status: 400 }),
        retry: 0,
      }).json<Response>(),
    );

    expect(await send(`/services/Cart/keys/a/state`)).toEqual({
      status: 400,
      message:
        'The server sent no error message: GET http://localhost:9070/query',
    });
  });

  it('keeps the Restate error code of a server error', async () => {
    vi.mocked(getState).mockImplementationOnce(() =>
      ky('http://localhost:9070/query', {
        fetch: async () =>
          Response.json(
            {
              message: 'Cannot reach the deployment',
              restate_code: 'META0003',
            },
            { status: 400 },
          ),
        retry: 0,
      }).json<Response>(),
    );

    expect(await send(`/services/Cart/keys/a/state`)).toEqual({
      status: 400,
      message: 'Cannot reach the deployment',
      restate_code: 'META0003',
    });
  });

  it.each([
    [
      'a timeout',
      () =>
        ky('http://localhost:9070/query', {
          fetch: () => new Promise<Response>(() => undefined),
          timeout: 1,
          retry: 0,
        }).json<Response>(),
      504,
      'UI0006',
    ],
    [
      'a network failure',
      () =>
        ky('http://localhost:9070/query', {
          fetch: async () => {
            throw new TypeError('Failed to fetch');
          },
          retry: 0,
        }).json<Response>(),
      500,
      'UI0005',
    ],
    [
      'a failing handler',
      async (): Promise<Response> => {
        throw new Error('Cannot read the rows');
      },
      500,
      'UI0007',
    ],
  ])(
    'marks %s with a UI error code, since no server answered',
    async (_, handler, status, code) => {
      vi.mocked(getState).mockImplementationOnce(handler);

      expect(await send(`/services/Cart/keys/a/state`)).toMatchObject({
        status,
        restate_code: code,
      });
    },
  );
});
