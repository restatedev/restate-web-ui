import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryContext } from './shared';

describe('createQueryContext', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('marks downstream SQL queries as built-in UI queries', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ rows: [] }));
    vi.stubGlobal('fetch', fetch);

    await createQueryContext(
      'https://restate.test',
      new Headers({ authorization: 'Bearer token' }),
      new Set(),
    ).query('SELECT 1', 'deployments/drained');

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('https://restate.test/query');
    expect(request.headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(request.headers.get('X-Restate-Query-Origin')).toBe('built-in');
    expect(request.headers.get('authorization')).toBe('Bearer token');
  });

  it('strips UI meta headers and forwards the rest downstream', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => Response.json({ rows: [] }));
    vi.stubGlobal('fetch', fetch);

    const context = createQueryContext(
      'https://restate.test',
      new Headers({
        authorization: 'Bearer token',
        'x-restate-query-level': 'operator',
        'x-restate-features': 'protocol_v7',
        'x-restate-ui-features': 'indexes_v1',
      }),
      new Set(['protocol_v7']),
    );
    await context.query('SELECT 1', 'deployments/drained');
    await context.adminApi('/deployments');

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [request] of fetch.mock.calls as [Request][]) {
      expect(request.headers.has('x-restate-features')).toBe(false);
      expect(request.headers.has('x-restate-ui-features')).toBe(false);
      expect(request.headers.get('authorization')).toBe('Bearer token');
      expect(request.headers.get('x-restate-query-level')).toBe('operator');
    }
  });
});
