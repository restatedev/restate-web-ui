import { NetworkError } from 'ky';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryContext } from './shared.js';

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
    expect(request.url).toBe(
      'https://restate.test/query?name=deployments/drained',
    );
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
        'x-restate-features': 'track_status_gauges',
        'x-restate-ui-features': 'indexes_v1',
      }),
      new Set(['track_status_gauges']),
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

  it('names a failed downstream call once', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(
      createQueryContext(
        'https://restate.test',
        new Headers(),
        new Set(),
      ).query('SELECT 1', 'deployments/drained'),
    ).rejects.toThrow(
      /^Request failed due to a network error: POST https:\/\/restate\.test\/query\?name=deployments\/drained$/,
    );
  });

  it('treats a network error that ky does not recognize as one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Connection reset')),
    );

    const failure = createQueryContext(
      'https://restate.test',
      new Headers(),
      new Set(),
    ).query('SELECT 1', 'deployments/drained');

    await expect(failure).rejects.toBeInstanceOf(NetworkError);
    await expect(failure).rejects.toThrow(
      'Request failed due to a network error: POST https://restate.test/query?name=deployments/drained',
    );
  });
});
