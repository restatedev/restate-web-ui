import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { isServiceStateQuery, isStateQuery } from './queryMatchers';

async function cachedQuery(path: string, pathParams: Record<string, string>) {
  const queryClient = new QueryClient();
  const queryKey = [path, { parameters: { path: pathParams } }];
  await queryClient.fetchQuery({
    queryKey,
    queryFn: async () => ({}),
    meta: { path, method: 'get' },
  });
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });
  if (!query) throw new Error('Expected query');
  return query;
}

describe('isStateQuery', () => {
  it('matches every state query of the service', async () => {
    for (const path of [
      '/query/services/{name}/state',
      '/query/services/{name}/state/query',
      '/query/services/{name}/keys/{key}/state',
      '/query/services/{name}/scopes/{scope}/keys/{key}/state',
      '/query/services/{name}/keys/{key}/state/entries',
    ]) {
      const query = await cachedQuery(path, { name: 'Counter', key: 'a' });
      expect(isStateQuery(query, 'Counter', 'a')).toBe(true);
      expect(isStateQuery(query, 'Count', 'a')).toBe(false);
    }
  });

  it('matches the stats of the edited object only', async () => {
    const objectStats = await cachedQuery(
      '/query/virtual-objects/{service}/instances/{key}/stats',
      { service: 'Counter', key: 'a' },
    );
    const workflowStats = await cachedQuery(
      '/query/workflows/{service}/runs/{workflowId}/stats',
      { service: 'Checkout', workflowId: 'order-1' },
    );

    expect(isStateQuery(objectStats, 'Counter', 'a')).toBe(true);
    expect(isStateQuery(objectStats, 'Counter', 'b')).toBe(false);
    expect(isStateQuery(workflowStats, 'Checkout', 'order-1')).toBe(true);
    expect(isStateQuery(workflowStats, 'Checkout', 'order-2')).toBe(false);
  });

  it('limits the service-wide matcher to state queries', async () => {
    const entries = await cachedQuery(
      '/query/services/{name}/keys/{key}/state/entries',
      { name: 'Counter', key: 'a' },
    );
    const objectStats = await cachedQuery(
      '/query/virtual-objects/{service}/instances/{key}/stats',
      { service: 'Counter', key: 'a' },
    );

    expect(isServiceStateQuery(entries, 'Counter')).toBe(true);
    expect(isServiceStateQuery(entries, 'CounterTwo')).toBe(false);
    expect(isServiceStateQuery(objectStats, 'Counter')).toBe(false);
  });

  it('ignores other query handlers', async () => {
    const lock = await cachedQuery(
      '/query/virtual-objects/{service}/instances/{key}/lock',
      { service: 'Counter', key: 'a' },
    );

    expect(isStateQuery(lock, 'Counter', 'a')).toBe(false);
  });
});
