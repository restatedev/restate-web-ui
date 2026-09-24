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
      '1.7.2',
      new Set(),
    ).query('SELECT 1', 'deployments/drained');

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('https://restate.test/query');
    expect(request.headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(request.headers.get('X-Restate-Query-Origin')).toBe('built-in');
    expect(request.headers.get('authorization')).toBe('Bearer token');
  });
});
