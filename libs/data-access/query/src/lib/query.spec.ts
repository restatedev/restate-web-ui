import { describe, expect, it, vi } from 'vitest';
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
