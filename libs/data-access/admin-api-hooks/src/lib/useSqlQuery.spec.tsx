import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type PropsWithChildren } from 'react';
import { RestateError } from '@restate/util/errors';
import { useSqlQuery } from './hooks';

const { fetchQuery, adminApiInit } = vi.hoisted(() => ({
  fetchQuery: vi.fn(),
  adminApiInit: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: (
    _type: string,
    path: string,
    method: string,
    init: { body: { query: string } },
  ) => {
    adminApiInit(init);
    return {
      queryKey: [path, method, init.body],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchQuery(init.body.query, signal),
    };
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSqlQuery duration', () => {
  let client: QueryClient;
  let now: number;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, experimental_prefetchInRender: true },
      },
    });
    now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    fetchQuery.mockReset();
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <StrictMode>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </StrictMode>
    );
  }

  it('keeps the client duration with cached results', async () => {
    const request = deferred<{ rows: { value: string }[] }>();
    fetchQuery.mockReturnValue(request.promise);
    const options = { staleTime: Infinity, refetchOnMount: false } as const;
    const first = renderHook(() => useSqlQuery('SELECT 1', options), {
      wrapper,
    });

    now = 350;
    await act(async () => request.resolve({ rows: [{ value: '1' }] }));
    await waitFor(() =>
      expect(first.result.current.data).toEqual({
        rows: [{ value: '1' }],
        queryDurationMs: 250,
      }),
    );
    const requestCount = fetchQuery.mock.calls.length;
    first.unmount();

    now = 900;
    const second = renderHook(() => useSqlQuery('SELECT 1', options), {
      wrapper,
    });
    expect(second.result.current.data?.queryDurationMs).toBe(250);
    expect(fetchQuery).toHaveBeenCalledTimes(requestCount);
  });

  it('keeps the original error and records a fresh duration on each failure', async () => {
    const first = deferred<never>();
    fetchQuery.mockReturnValue(first.promise);
    const { result } = renderHook(() => useSqlQuery('invalid'), { wrapper });
    const error = new RestateError(
      'Invalid SQL',
      'SQL_ERROR',
      false,
      undefined,
      400,
    );
    now = 500;
    await act(async () => first.reject(error));
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.error).toMatchObject({
      message: 'Invalid SQL',
      status: 400,
      restate_code: 'SQL_ERROR',
      queryDurationMs: 400,
    });

    const second = deferred<never>();
    fetchQuery.mockReturnValue(second.promise);
    now = 600;
    act(() => {
      void result.current.refetch();
    });
    now = 650;
    const networkError = new TypeError('Failed to fetch');
    await act(async () => second.reject(networkError));
    await waitFor(() => expect(result.current.error).toBe(networkError));
    expect(result.current.error?.queryDurationMs).toBe(50);
  });

  it('keeps durations separate when the query changes', async () => {
    const oldRequest = deferred<{ rows: never[] }>();
    const newRequest = deferred<{ rows: never[] }>();
    fetchQuery.mockImplementation((sql: string) =>
      sql === 'SELECT old' ? oldRequest.promise : newRequest.promise,
    );
    const { result, rerender } = renderHook(({ sql }) => useSqlQuery(sql), {
      wrapper,
      initialProps: { sql: 'SELECT old' },
    });
    now = 200;
    rerender({ sql: 'SELECT new' });
    now = 230;
    await act(async () => newRequest.resolve({ rows: [] }));
    await waitFor(() => expect(result.current.data?.queryDurationMs).toBe(30));
    now = 1000;
    await act(async () => oldRequest.resolve({ rows: [] }));
    expect(result.current.data?.queryDurationMs).toBe(30);
  });
});

describe('useSqlQuery origin', () => {
  it('marks explicit SQL as a user query', () => {
    const client = new QueryClient();
    fetchQuery.mockResolvedValue({ rows: [] });
    const { unmount } = renderHook(() => useSqlQuery('SELECT 1'), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    expect(adminApiInit).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'X-Restate-Query-Origin': 'user' },
      }),
    );
    unmount();
    client.clear();
  });
});
