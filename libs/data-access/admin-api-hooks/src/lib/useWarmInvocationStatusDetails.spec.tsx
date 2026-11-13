import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useWarmInvocationStatusDetails } from './hooks';

const { fetchStatuses } = vi.hoisted(() => ({
  fetchStatuses: vi.fn((invocationIds: string[]) => ({
    invocations: Object.fromEntries(
      invocationIds.map((id) => [id, { status: 'suspended' }]),
    ),
  })),
}));

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
    queryFn: () => fetchStatuses(body.invocationIds),
  }),
}));

describe('useWarmInvocationStatusDetails', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetchStatuses.mockClear();
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
});
