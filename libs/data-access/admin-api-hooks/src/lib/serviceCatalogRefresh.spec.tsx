import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useListDeployments, useListServices } from './hooks';

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({}),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  getOverviewRefreshMeta: () => ({}),
  adminApi: (
    _type: string,
    path: string,
    method: string,
    init?: { body?: unknown },
  ) => ({
    queryKey: [path, method, init?.body],
    meta: {},
    queryFn: () => fetchApi(path),
  }),
}));

describe('service catalog refresh', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    fetchApi.mockReset();
    fetchApi.mockImplementation(async (path: string) => {
      if (path === '/query') {
        return {
          rows: [
            {
              name: 'Greeter',
              ty: 'service',
              revision: 1,
              deployment_id: 'dp_1',
            },
          ],
        };
      }
      if (path === '/deployments') {
        return { deployments: [] };
      }
      return { services: [] };
    });
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

  it.each([
    { hook: 'useListDeployments', useList: () => useListDeployments() },
    { hook: 'useListServices', useList: () => useListServices() },
  ])(
    'refetches the catalog without re-rendering $hook',
    async ({ useList }) => {
      let renders = 0;
      const { result } = renderHook(
        () => {
          renders++;
          return useList();
        },
        { wrapper },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(() =>
        expect(
          client.getQueryCache().find({ queryKey: ['/query'], exact: false })
            ?.state.status,
        ).toBe('success'),
      );
      const catalogRequests = () =>
        fetchApi.mock.calls.filter(([path]) => path === '/query').length;
      const requestsBefore = catalogRequests();
      const rendersBefore = renders;

      await act(async () => {
        await client.refetchQueries({ queryKey: ['/query'] });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(catalogRequests()).toBe(requestsBefore + 1);
      expect(renders).toBe(rendersBefore);
    },
  );
});
