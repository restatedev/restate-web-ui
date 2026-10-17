import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useRestartWorkflowAsNew } from './hooks';

const { getAuthToken } = vi.hoisted(() => ({
  getAuthToken: vi.fn<() => string | undefined>(),
}));

vi.mock('@restate/util-api-config', () => ({ getAuthToken }));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({
    ingressUrl: 'http://localhost:8080/',
    isVersionGte: () => true,
  }),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: (_type: string, path: string) => ({
    queryKey: [path],
    queryFn: () =>
      path === '/query/v2/invocations/{invocationId}'
        ? {
            target_service_name: 'Checkout',
            target_handler_name: 'run',
            journal: { entries: [{ type: 'Input', category: 'command' }] },
          }
        : {
            parameters: 'eyJhIjoxfQ==',
            headers: [
              { key: 'content-type', value: 'application/json' },
              { key: 'authorization', value: 'Bearer journal' },
              { key: 'x-forwarded-for', value: '10.0.0.1' },
              { key: 'x-restate-id', value: 'inv_old' },
            ],
          },
  }),
}));

describe('useRestartWorkflowAsNew', () => {
  let client: QueryClient;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    client = new QueryClient();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () =>
      Response.json({ invocationId: 'inv_new', status: 'Accepted' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    getAuthToken.mockReset();
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  async function restart() {
    const { result } = renderHook(() => useRestartWorkflowAsNew('inv_old'), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync({
        invocationId: 'inv_old',
        workflowId: 'wf-2',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://localhost:8080/restate/send/Checkout/wf-2/run');
    expect(init).toMatchObject({ credentials: 'include', method: 'POST' });
    return new Headers(init?.headers);
  }

  it('replaces the journal authorization header with the auth token', async () => {
    getAuthToken.mockReturnValue('token-123');

    const headers = await restart();

    expect(headers.get('authorization')).toBe('Bearer token-123');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('x-forwarded-for')).toBe(false);
    expect(headers.has('x-restate-id')).toBe(false);
  });

  it('sends the journal headers unchanged without an auth token', async () => {
    getAuthToken.mockReturnValue(undefined);

    const headers = await restart();

    expect([...headers.entries()]).toEqual([
      ['authorization', 'Bearer journal'],
      ['content-type', 'application/json'],
    ]);
  });
});
