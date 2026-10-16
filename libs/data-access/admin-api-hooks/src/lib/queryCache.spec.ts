import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
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

  describe('when the server features change', () => {
    const META_KEY = ['meta', 'https://restate.test'] as const;
    const HANDLER_KEY = ['/query/v2/invocations/summary', { baseUrl: '' }];

    async function setup() {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      await queryClient.fetchQuery({
        queryKey: META_KEY,
        queryFn: async () => ({}),
      });
      const metaQuery = queryClient
        .getQueryCache()
        .find({ queryKey: META_KEY, exact: true });
      if (!metaQuery) throw new Error('Expected meta query');
      const receiveVersion = (features: Record<string, boolean>) =>
        queryCacheOnSuccess(queryClient, { features }, metaQuery);
      return { queryClient, receiveVersion };
    }

    function observeHandler(
      queryClient: QueryClient,
      queryFn: () => Promise<unknown>,
    ) {
      const observer = new QueryObserver(queryClient, {
        queryKey: HANDLER_KEY,
        queryFn,
      });
      const unsubscribe = observer.subscribe(() => undefined);
      return { observer, unsubscribe };
    }

    it('re-runs query handlers that already failed with the restored flags', async () => {
      const { queryClient, receiveVersion } = await setup();
      receiveVersion({ track_status_gauges: true });
      const queryFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('sys_service_stats not found'))
        .mockResolvedValue({ rows: [] });
      const { observer, unsubscribe } = observeHandler(queryClient, queryFn);
      await vi.waitFor(() =>
        expect(observer.getCurrentResult().status).toBe('error'),
      );

      receiveVersion({});

      await vi.waitFor(() =>
        expect(observer.getCurrentResult().status).toBe('success'),
      );
      expect(queryFn).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('re-runs query handlers that fail after the fresh flags arrive', async () => {
      const { queryClient, receiveVersion } = await setup();
      receiveVersion({ track_status_gauges: true });
      let rejectFirst: (error: Error) => void = () => undefined;
      const queryFn = vi
        .fn()
        .mockImplementationOnce(
          () => new Promise((_, reject) => (rejectFirst = reject)),
        )
        .mockResolvedValue({ rows: [] });
      const { observer, unsubscribe } = observeHandler(queryClient, queryFn);
      await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

      receiveVersion({});
      rejectFirst(new Error('sys_service_stats not found'));

      await vi.waitFor(() =>
        expect(observer.getCurrentResult().status).toBe('success'),
      );
      expect(queryFn).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('leaves failed queries alone when the flags are unchanged', async () => {
      const { queryClient, receiveVersion } = await setup();
      receiveVersion({ track_status_gauges: true });
      const queryFn = vi.fn().mockRejectedValue(new Error('boom'));
      const { observer, unsubscribe } = observeHandler(queryClient, queryFn);
      await vi.waitFor(() =>
        expect(observer.getCurrentResult().status).toBe('error'),
      );

      receiveVersion({ track_status_gauges: true });

      expect(observer.getCurrentResult().status).toBe('error');
      expect(queryFn).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });
});
