import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  useGetInvocationStatusDetails,
  useWarmInvocationStatusDetails,
} from './hooks';

type Statuses = { invocations: Record<string, { status: string }> };

const { fetchStatuses, onAbort, suspended } = vi.hoisted(() => {
  const suspended = (invocationIds: string[]): Statuses => ({
    invocations: Object.fromEntries(
      invocationIds.map((id) => [id, { status: 'suspended' }]),
    ),
  });
  return {
    suspended,
    onAbort: vi.fn(),
    fetchStatuses: vi.fn(
      (invocationIds: string[]): Statuses | Promise<Statuses> =>
        suspended(invocationIds),
    ),
  };
});

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({}),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: (
    _type: string,
    path: string,
    _method: string,
    { body }: { body: { invocationIds: string[] } },
  ) => ({
    queryKey: [path, body],
    queryFn: ({ signal }: { signal?: AbortSignal }) => {
      signal?.addEventListener('abort', onAbort);
      return fetchStatuses(body.invocationIds);
    },
  }),
}));

describe('useWarmInvocationStatusDetails', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetchStatuses.mockReset();
    onAbort.mockClear();
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  function render(initialInvocationIds: string[]) {
    return renderHook(
      ({ invocationIds }) =>
        useWarmInvocationStatusDetails(invocationIds, 'inv_parent', {
          refetchInterval: false,
          refetchOnWindowFocus: false,
        }),
      { wrapper, initialProps: { invocationIds: initialInvocationIds } },
    );
  }

  it('asks for invocations as soon as they are referenced', async () => {
    const { result, rerender } = render([]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchStatuses).not.toHaveBeenCalled();

    rerender({ invocationIds: ['inv_child'] });

    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_child']?.status).toBe(
        'suspended',
      ),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(1);
    expect(fetchStatuses).toHaveBeenCalledWith(['inv_child']);
  });

  it('only asks again when a new invocation is referenced', async () => {
    const { result, rerender } = render(['inv_child']);
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_child']).toBeDefined(),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(1);

    rerender({ invocationIds: ['inv_child'] });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchStatuses).toHaveBeenCalledTimes(1);

    rerender({ invocationIds: ['inv_child', 'inv_grandchild'] });
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_grandchild']?.status).toBe(
        'suspended',
      ),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(2);
    expect(fetchStatuses).toHaveBeenLastCalledWith([
      'inv_child',
      'inv_grandchild',
    ]);
  });

  it('lets a slow poll finish, then asks for invocations referenced meanwhile', async () => {
    const { result, rerender } = render(['inv_child']);
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_child']).toBeDefined(),
    );

    let finishSlowPoll = () => undefined as void;
    fetchStatuses.mockImplementationOnce(
      (invocationIds) =>
        new Promise((resolve) => {
          finishSlowPoll = () => resolve(suspended(invocationIds));
        }),
    );
    void result.current.refetch();
    await waitFor(() => expect(fetchStatuses).toHaveBeenCalledTimes(2));

    rerender({ invocationIds: ['inv_child', 'inv_sibling'] });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onAbort).not.toHaveBeenCalled();
    expect(fetchStatuses).toHaveBeenCalledTimes(2);

    finishSlowPoll();
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_sibling']?.status).toBe(
        'suspended',
      ),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(3);
    expect(onAbort).not.toHaveBeenCalled();
  });

  it('asks again when the cached statuses are cleared', async () => {
    const { result, rerender } = render([]);
    rerender({ invocationIds: ['inv_child'] });
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_child']).toBeDefined(),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(1);

    act(() => {
      client.setQueryData(result.current.queryKey, { invocations: {} });
    });

    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_child']?.status).toBe(
        'suspended',
      ),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(2);
  });

  it('keeps statuses of invocations no longer shown and never asks again for finished ones', async () => {
    fetchStatuses.mockImplementation((invocationIds) => ({
      invocations: Object.fromEntries(
        invocationIds.map((id) => [id, { status: 'succeeded' }]),
      ),
    }));
    const { result, rerender } = render(['inv_a']);
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_a']).toBeDefined(),
    );

    rerender({ invocationIds: [] });
    rerender({ invocationIds: ['inv_b'] });
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_b']).toBeDefined(),
    );
    expect(fetchStatuses).toHaveBeenLastCalledWith(['inv_b']);

    rerender({ invocationIds: ['inv_a'] });
    expect(result.current.data?.invocations?.['inv_a']?.status).toBe(
      'succeeded',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchStatuses).toHaveBeenCalledTimes(2);
  });

  it('asks only for the unfinished invocations it is given', async () => {
    fetchStatuses.mockImplementation((invocationIds) => ({
      invocations: Object.fromEntries(
        invocationIds.map((id) => [
          id,
          { status: id === 'inv_done' ? 'succeeded' : 'suspended' },
        ]),
      ),
    }));
    const { result, rerender } = render(['inv_done', 'inv_a']);
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_a']).toBeDefined(),
    );

    rerender({ invocationIds: ['inv_done', 'inv_b'] });
    await waitFor(() =>
      expect(result.current.data?.invocations?.['inv_b']).toBeDefined(),
    );
    expect(fetchStatuses).toHaveBeenLastCalledWith(['inv_b']);
    expect(result.current.data?.invocations?.['inv_a']?.status).toBe(
      'suspended',
    );
  });

  describe('read through useGetInvocationStatusDetails', () => {
    function renderWithReader(initialInvocationIds: string[]) {
      return renderHook(
        ({ invocationIds }) => ({
          warm: useWarmInvocationStatusDetails(invocationIds, 'inv_parent', {
            refetchInterval: false,
            refetchOnWindowFocus: false,
          }),
          target: useGetInvocationStatusDetails('inv_b', 'inv_parent'),
        }),
        { wrapper, initialProps: { invocationIds: initialInvocationIds } },
      );
    }

    it('waits for the invocation’s own status, not just any status', async () => {
      const { result, rerender } = renderWithReader(['inv_a']);
      await waitFor(() =>
        expect(result.current.warm.data?.invocations?.['inv_a']).toBeDefined(),
      );
      expect(result.current.target.isPending).toBe(true);
      expect(result.current.target.data).toBeUndefined();

      rerender({ invocationIds: ['inv_a', 'inv_b'] });
      await waitFor(() =>
        expect(result.current.target.data?.status).toBe('suspended'),
      );
      expect(result.current.target.isPending).toBe(false);
    });

    it('stops waiting when the statuses request fails', async () => {
      fetchStatuses.mockImplementation(() =>
        Promise.reject(new Error('statuses failed')),
      );
      const { result } = renderWithReader(['inv_b']);
      await waitFor(() => expect(result.current.target.error).toBeTruthy());
      expect(result.current.target.isPending).toBe(false);
    });
  });

  it('stops asking for an invocation the server leaves out', async () => {
    fetchStatuses.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ invocations: {} }), 10),
        ),
    );
    const { result } = render(['not_an_invocation']);
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const calls = fetchStatuses.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchStatuses).toHaveBeenCalledTimes(calls);
    expect(calls).toBeLessThanOrEqual(2);
  });
});
