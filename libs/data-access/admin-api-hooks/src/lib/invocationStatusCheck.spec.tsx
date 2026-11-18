import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  createStatusCheckState,
  runInvocationStatusCheck,
  useInvocationStatusCheck,
} from './invocationStatusCheck';
import { getInvocationStatusDetailsQueryKey } from './hooks';

type Statuses = { invocations: Record<string, { status?: string }> };

const { fetchStatuses } = vi.hoisted(() => ({
  fetchStatuses: vi.fn(
    (invocationIds: string[]): Statuses | Promise<Statuses> => ({
      invocations: Object.fromEntries(
        invocationIds.map((id) => [id, { status: 'running' }]),
      ),
    }),
  ),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => BASE_URL,
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

const BASE_URL = 'http://localhost:9070';
const PARENT = 'inv_parent';
const sharedKey = getInvocationStatusDetailsQueryKey(BASE_URL, PARENT);
const isProblem = (status?: string) =>
  status === 'failed' || status === 'backing-off';

function statuses(entries: Record<string, string | undefined>): Statuses {
  return {
    invocations: Object.fromEntries(
      Object.entries(entries).map(([id, status]) => [
        id,
        status ? { status } : {},
      ]),
    ),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('runInvocationStatusCheck', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient();
    fetchStatuses.mockReset();
    fetchStatuses.mockImplementation((ids) =>
      statuses(Object.fromEntries(ids.map((id) => [id, 'running']))),
    );
  });

  function run(
    state: ReturnType<typeof createStatusCheckState>,
    invocationIds: string[],
    options: {
      batchSize?: number;
      maxPerRefresh?: number;
      onProgress?: (
        checked: number,
        total: number,
        isIncomplete?: boolean,
      ) => void;
    } = {},
  ) {
    return runInvocationStatusCheck({
      context: { client },
      state,
      invocationIds,
      baseUrl: BASE_URL,
      referenceInvocationId: PARENT,
      sharedKey,
      batchSize: options.batchSize ?? 2,
      maxPerRefresh: options.maxPerRefresh ?? 100,
      shouldShare: isProblem,
      onProgress: options.onProgress,
    });
  }

  it('sends one batch at a time', async () => {
    const first = deferred<Statuses>();
    fetchStatuses.mockImplementationOnce(() => first.promise);
    const state = createStatusCheckState();
    const done = run(state, ['a', 'b', 'c', 'd', 'e']);

    await Promise.resolve();
    expect(fetchStatuses).toHaveBeenCalledTimes(1);
    expect(fetchStatuses).toHaveBeenLastCalledWith(['a', 'b']);

    first.resolve(statuses({ a: 'running', b: 'running' }));
    await done;
    expect(fetchStatuses.mock.calls.map(([ids]) => ids)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
  });

  it('checks new ids first and rotates through known open ones', async () => {
    const state = createStatusCheckState();
    await run(state, ['a', 'b', 'c', 'd', 'e'], { batchSize: 10 });
    fetchStatuses.mockClear();

    await run(state, ['a', 'b', 'c', 'd', 'e', 'x'], {
      batchSize: 10,
      maxPerRefresh: 3,
    });
    await run(state, ['a', 'b', 'c', 'd', 'e', 'x'], {
      batchSize: 10,
      maxPerRefresh: 3,
    });

    expect(fetchStatuses.mock.calls.map(([ids]) => ids)).toEqual([
      ['x', 'a', 'b'],
      ['c', 'd', 'e'],
    ]);
  });

  it('skips finished children', async () => {
    fetchStatuses.mockImplementation(() =>
      statuses({ a: 'succeeded', b: 'running' }),
    );
    const state = createStatusCheckState();
    await run(state, ['a', 'b']);
    fetchStatuses.mockClear();

    await run(state, ['a', 'b']);

    expect(fetchStatuses).toHaveBeenCalledWith(['b']);
  });

  it('checks only new ids in a new-children run and counts no misses', async () => {
    fetchStatuses.mockImplementation((ids) =>
      statuses(Object.fromEntries(ids.map((id) => [id, undefined]))),
    );
    const state = createStatusCheckState();
    state.misses.set('a', 1);
    state.untriedOnly = true;

    await run(state, ['a', 'b']);

    expect(fetchStatuses).toHaveBeenCalledWith(['b']);
    expect(state.misses.get('b')).toBe(0);
    expect(state.untriedOnly).toBe(false);
  });

  it('stops checking an id after three empty answers', async () => {
    fetchStatuses.mockImplementation((ids) =>
      statuses(Object.fromEntries(ids.map((id) => [id, undefined]))),
    );
    const state = createStatusCheckState();
    for (let attempt = 0; attempt < 3; attempt++) {
      await run(state, ['gone']);
    }
    fetchStatuses.mockClear();

    await run(state, ['gone']);

    expect(fetchStatuses).not.toHaveBeenCalled();
  });

  it('keeps what it checked when a batch fails and resumes from there', async () => {
    fetchStatuses
      .mockImplementationOnce(() => statuses({ a: 'failed', b: 'running' }))
      .mockImplementationOnce(() => {
        throw new Error('unavailable');
      });
    const onProgress = vi.fn();
    const state = createStatusCheckState();

    await expect(
      run(state, ['a', 'b', 'c', 'd', 'e'], { onProgress }),
    ).rejects.toThrow('unavailable');

    expect(onProgress).toHaveBeenLastCalledWith(2, 5, true);
    expect(client.getQueryData<Statuses>(sharedKey)?.invocations['a']).toEqual({
      status: 'failed',
    });

    fetchStatuses.mockClear();
    onProgress.mockClear();
    await run(state, ['a', 'b', 'c', 'd', 'e'], {
      onProgress,
      maxPerRefresh: 3,
    });

    expect(fetchStatuses.mock.calls[0]?.[0]).toEqual(['c', 'd']);
    expect(onProgress).toHaveBeenLastCalledWith(3, 3);
  });

  it('shares problem statuses and updates ids the page already shows', async () => {
    client.setQueryData(sharedKey, statuses({ c: 'suspended' }));
    fetchStatuses.mockImplementation(() =>
      statuses({ a: 'backing-off', b: 'running', c: 'running' }),
    );

    await run(createStatusCheckState(), ['a', 'b', 'c'], { batchSize: 10 });

    expect(client.getQueryData<Statuses>(sharedKey)?.invocations).toEqual({
      a: { status: 'backing-off' },
      c: { status: 'running' },
    });
  });

  it('writes a finished problem back when the page cache lost it', async () => {
    fetchStatuses.mockImplementation(() =>
      statuses({ a: 'failed', b: 'running' }),
    );
    const state = createStatusCheckState();
    await run(state, ['a', 'b'], { batchSize: 10 });
    client.setQueryData(sharedKey, statuses({ b: 'running' }));
    fetchStatuses.mockImplementation(() => statuses({ b: 'running' }));

    await run(state, ['a', 'b'], { batchSize: 10 });

    expect(fetchStatuses).toHaveBeenLastCalledWith(['b']);
    expect(client.getQueryData<Statuses>(sharedKey)?.invocations['a']).toEqual({
      status: 'failed',
    });
  });

  it('reports progress only from the latest run', async () => {
    const slow = deferred<Statuses>();
    fetchStatuses.mockImplementationOnce(() => slow.promise);
    const onProgress = vi.fn();
    const state = createStatusCheckState();

    const older = run(state, ['a'], { onProgress });
    await run(state, ['b'], { onProgress });
    slow.resolve(statuses({ a: 'running' }));
    await older;

    expect(onProgress.mock.calls).toEqual([[1, 1]]);
  });
});

describe('useInvocationStatusCheck', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetchStatuses.mockReset();
    fetchStatuses.mockImplementation((ids) =>
      statuses(Object.fromEntries(ids.map((id) => [id, 'running']))),
    );
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.useRealTimers();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  function render(
    initialInvocationIds: string[],
    options: {
      refetchInterval?: (unfinished: number) => number | false;
      onProgress?: (
        checked: number,
        total: number,
        isIncomplete?: boolean,
      ) => void;
    } = {},
  ) {
    return renderHook(
      ({ invocationIds }) =>
        useInvocationStatusCheck(invocationIds, PARENT, {
          enabled: true,
          batchSize: 2,
          maxPerRefresh: 100,
          shouldShare: isProblem,
          refetchInterval: options.refetchInterval ?? (() => false),
          onProgress: options.onProgress,
        }),
      { wrapper, initialProps: { invocationIds: initialInvocationIds } },
    );
  }

  it('checks children that appear later right away, and only them', async () => {
    const { rerender } = render(['a']);
    await waitFor(() => expect(fetchStatuses).toHaveBeenCalledWith(['a']));
    await waitFor(() =>
      expect(
        client.getQueryState([
          '/query/invocations/statuses/check',
          { baseUrl: BASE_URL, referenceInvocationId: PARENT },
        ])?.fetchStatus,
      ).toBe('idle'),
    );

    rerender({ invocationIds: ['a', 'b'] });

    await waitFor(() => expect(fetchStatuses).toHaveBeenLastCalledWith(['b']));
    expect(fetchStatuses).toHaveBeenCalledTimes(2);
  });

  it('retries a failed check even when not live', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchStatuses.mockImplementationOnce(() => {
      throw new Error('unavailable');
    });
    const onProgress = vi.fn();
    render(['a', 'b'], { onProgress });

    await waitFor(() =>
      expect(onProgress).toHaveBeenLastCalledWith(0, 2, true),
    );
    expect(fetchStatuses).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    await waitFor(() => expect(onProgress).toHaveBeenLastCalledWith(2, 2));
    expect(fetchStatuses).toHaveBeenCalledTimes(2);
  });

  it('refreshes open children on the live interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(['a', 'b'], { refetchInterval: () => 15_000 });
    await waitFor(() => expect(fetchStatuses).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(14_000));
    expect(fetchStatuses).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1_500));
    await waitFor(() => expect(fetchStatuses).toHaveBeenCalledTimes(2));
  });
});
