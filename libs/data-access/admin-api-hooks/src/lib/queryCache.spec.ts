import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryCacheOnSuccess } from './queryCache';

describe('queryCacheOnSuccess', () => {
  it('replaces the matching invocation row from a VQueue snapshot', async () => {
    const queryClient = new QueryClient();
    const listQueryKey = ['/query/v2/invocations', { page: 1 }] as const;
    const list = {
      rows: [
        { id: 'inv-a', status: 'scheduled' },
        { id: 'inv-b', status: 'running' },
      ],
      limit: 100,
      mode: 'exact',
      isPartial: false,
    };
    await queryClient.fetchQuery({
      queryKey: listQueryKey,
      queryFn: async () => list,
      meta: { method: 'post' },
    });
    const vqueueData = {
      focusedInvocation: { id: 'inv-a', status: 'running' },
    };
    const vqueueQueryKey = [
      '/query/vqueues/{vqueueId}',
      { vqueueId: 'vq-a', focusEntryId: 'inv-a' },
    ] as const;
    await queryClient.fetchQuery({
      queryKey: vqueueQueryKey,
      queryFn: async () => vqueueData,
      meta: { method: 'get' },
    });
    const vqueueQuery = queryClient.getQueryCache().find({
      queryKey: vqueueQueryKey,
      exact: true,
    });

    expect(vqueueQuery).toBeDefined();
    if (!vqueueQuery) throw new Error('Expected VQueue query');
    queryCacheOnSuccess(queryClient, vqueueData, vqueueQuery);

    expect(queryClient.getQueryData(listQueryKey)).toEqual({
      ...list,
      rows: [
        { id: 'inv-a', status: 'running' },
        { id: 'inv-b', status: 'running' },
      ],
    });
  });
});
