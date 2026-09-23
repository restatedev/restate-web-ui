import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '@restate/data-access/query';
import { useListInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import {
  TERMINAL_INVOCATION_STATUSES,
  type components,
} from '@restate/data-access/admin-api-spec';
import { useInvocationSummary } from './useInvocationSummary';

type Filter = components['schemas']['InvocationV2FilterItem'];
type SummaryRequest = components['schemas']['SummaryInvocationsV2RequestBody'];

const api = vi.hoisted(() => ({
  features: new Set(['vqueues', 'protocol_v7']),
  request: vi.fn<(path: string, body: SummaryRequest) => Promise<unknown>>(),
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigation: () => ({ state: 'idle' }),
}));

vi.mock('@restate/data-access/admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@restate/data-access/admin-api')>()),
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://query.test',
  useFeatures: () => api.features,
  adminApi: (
    _kind: string,
    path: string,
    _method: string,
    { body }: { body: SummaryRequest },
  ) => ({
    queryKey: [path, body],
    queryFn: () => api.request(path, body),
  }),
}));

vi.mock('@restate/features/restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '' }),
}));

let completed = 30;
let active = 0;
const clients: QueryClient[] = [];

async function execute(path: string, body: SummaryRequest) {
  const response = await query(
    new Request(`http://query.test${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-restate-version': '1.7.9',
        'x-restate-features': [...api.features].join(','),
      },
      body: JSON.stringify(body),
    }),
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function wrapper({ children }: PropsWithChildren) {
  const [client] = useState(() => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    clients.push(client);
    return client;
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function filters(
  focus: 'all' | 'completed' | 'not-completed',
  service = 'AgentSession',
): Filter[] {
  return [
    {
      field: 'target_service_name',
      type: 'STRING_LIST',
      operation: 'IN',
      value: [service],
    },
    ...(focus === 'all'
      ? []
      : [
          {
            field: 'status' as const,
            type: 'STRING_LIST' as const,
            operation:
              focus === 'completed' ? ('IN' as const) : ('NOT_IN' as const),
            value: [...TERMINAL_INVOCATION_STATUSES],
          },
        ]),
  ];
}

function usePage(
  selectedFilters: Filter[],
  countMode: 'exact' | 'estimate' = 'exact',
) {
  const summary = useInvocationSummary({
    filters: selectedFilters,
    countMode,
    breakdownSampleSize: 1000,
  });
  const list = useListInvocationsV2({
    filters: selectedFilters,
    mode: { type: 'exact' },
  });
  return { summary, list };
}

beforeEach(() => {
  completed = 30;
  active = 0;
  api.features = new Set(['vqueues', 'protocol_v7']);
  api.request.mockReset().mockImplementation(execute);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request | string | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      const { query: sql } = (await request.json()) as { query: string };
      const serviceCount = sql.includes("'Other'") ? 7 : completed;
      let rows: Record<string, unknown>[] = [];
      if (sql.includes('SUM(vm.num_inbox)')) {
        rows = [
          {
            service_name: 'AgentSession',
            running: active,
            ...(sql.includes('SUM(vm.num_finished)')
              ? { finished: completed }
              : {}),
          },
          {
            service_name: 'Other',
            running: 0,
            ...(sql.includes('SUM(vm.num_finished)') ? { finished: 7 } : {}),
          },
        ];
      } else if (sql.includes(' AS bucket')) {
        rows = [
          {
            service_name: sql.includes("'Other'") ? 'Other' : 'AgentSession',
            bucket: 'succeeded',
            count: serviceCount,
          },
        ];
        if (active)
          rows.push({
            service_name: 'AgentSession',
            bucket: 'running',
            count: active,
          });
      } else if (sql.includes("v.stage = 'finished'")) {
        rows = [{ status: 'succeeded', count: completed + 7 }];
      } else if (
        sql.includes("ss.status = 'completed'") &&
        sql.includes('GROUP BY')
      ) {
        rows = [
          {
            service_name: 'AgentSession',
            status: 'succeeded',
            count: completed,
          },
          { service_name: 'Other', status: 'succeeded', count: 7 },
        ];
      } else if (
        sql.includes('ss.id AS id') &&
        !sql.includes("ss.status != 'completed'")
      ) {
        rows = Array.from(
          { length: Math.min(serviceCount, 250) },
          (_, index) => ({ id: `inv-${index}` }),
        );
      } else if (sql.includes('FROM sys_invocation i')) {
        rows = Array.from(
          { length: Math.min(serviceCount, 250) },
          (_, index) => ({
            id: `inv-${index}`,
            target: 'AgentSession/run',
            target_service_name: 'AgentSession',
            target_handler_name: 'run',
            target_service_ty: 'service',
            status: 'completed',
            completion_result: 'success',
            created_at: '2026-09-22T10:00:00Z',
            modified_at: '2026-09-22T10:00:01Z',
            completed_at: '2026-09-22T10:00:01Z',
            retry_count: 0,
          }),
        );
      }
      return Response.json({ rows });
    }),
  );
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});

describe('invocation page query composition', () => {
  it('waits for filter readiness before issuing any summary requests', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useInvocationSummary({
          filters: filters('all'),
          countMode: 'exact',
          breakdownSampleSize: 1000,
          enabled,
        }),
      { initialProps: { enabled: false }, wrapper },
    );
    expect(api.request).not.toHaveBeenCalled();
    expect(result.current.matchingCount).toBeUndefined();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.matchingCount?.count).toBe(30));
  });

  it('uses a ready service breakdown even when the unrelated global breakdown fails', async () => {
    const gate = deferred();
    api.request.mockImplementation(async (path, body) => {
      if (body.view === 'breakdowns') {
        await gate.promise;
        throw new Error('Global breakdown unavailable');
      }
      return execute(path, body);
    });
    const { result } = renderHook(() => usePage(filters('completed')), {
      wrapper,
    });
    await waitFor(() =>
      expect(
        result.current.summary.byStatus.find(({ name }) => name === 'succeeded')
          ?.count,
      ).toBe(30),
    );
    expect(result.current.summary.isBreakdownLoading('finished')).toBe(false);
    await act(async () => gate.resolve());
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    expect(result.current.summary.isBreakdownError('finished')).toBe(false);
    expect(result.current.summary.matchingCount?.count).toBe(30);
  });
  it.each([30, 300])(
    'keeps %i completed invocations visible through every lifecycle selection',
    async (count) => {
      completed = count;
      const { result, rerender } = renderHook(
        ({ focus }: { focus: 'all' | 'completed' | 'not-completed' }) =>
          usePage(filters(focus)),
        {
          initialProps: { focus: 'all' },
          wrapper,
        },
      );
      for (const focus of [
        'all',
        'not-completed',
        'completed',
        'all',
      ] as const) {
        rerender({ focus });
        await waitFor(() => {
          expect(result.current.summary.isFetching).toBe(false);
          expect(result.current.list.isSuccess).toBe(true);
        });
        expect(
          result.current.summary.byStage.find(({ name }) => name === 'finished')
            ?.count,
        ).toBe(count);
        expect(
          result.current.summary.byStatus.find(
            ({ name }) => name === 'succeeded',
          )?.count,
        ).toBe(count);
        expect(result.current.summary.matchingCount?.count).toBe(
          focus === 'not-completed' ? 0 : count,
        );
        expect(result.current.list.data?.rows).toHaveLength(
          focus === 'not-completed' ? 0 : Math.min(count, 250),
        );
      }
    },
  );

  it.each(['exact', 'estimate'] as const)(
    'retains stage totals while %s breakdowns are delayed and fail',
    async (countMode) => {
      const gate = deferred();
      api.request.mockImplementation(async (path, body) => {
        if (body.view === 'breakdowns' || body.view === 'all') {
          await gate.promise;
          throw new Error('Breakdown unavailable');
        }
        return execute(path, body);
      });
      const { result } = renderHook(() => usePage(filters('all'), countMode), {
        wrapper,
      });
      await waitFor(() => expect(result.current.summary.isLoading).toBe(false));
      expect(
        result.current.summary.byStage.find(({ name }) => name === 'finished')
          ?.count,
      ).toBe(30);
      expect(result.current.summary.isBreakdownLoading('finished')).toBe(true);
      await act(async () => gate.resolve());
      await waitFor(() =>
        expect(result.current.summary.isBreakdownError('finished')).toBe(true),
      );
      expect(result.current.summary.matchingCount).toEqual({
        count: 30,
        isPartial: false,
      });
      expect(
        result.current.summary.byStage.find(({ name }) => name === 'finished')
          ?.count,
      ).toBe(30);
    },
  );

  it('merges completion by service when completed VQueue migration was skipped', async () => {
    api.features.add('vqueues_migration_skip_completed');
    const gate = deferred();
    api.request.mockImplementation(async (path, body) => {
      if (body.view === 'breakdowns') await gate.promise;
      return execute(path, body);
    });
    const { result } = renderHook(() => usePage(filters('all')), { wrapper });
    await waitFor(() => expect(result.current.summary.isLoading).toBe(false));
    expect(result.current.summary.matchingCount).toBeUndefined();
    expect(result.current.summary.isBreakdownLoading('finished')).toBe(true);
    await act(async () => gate.resolve());
    await waitFor(() =>
      expect(result.current.summary.matchingCount?.count).toBe(30),
    );
    expect(
      result.current.summary.byStage.find(({ name }) => name === 'finished')
        ?.count,
    ).toBe(30);
  });

  it('supports servers without VQueues', async () => {
    api.features.delete('vqueues');
    const { result } = renderHook(() => usePage(filters('all')), { wrapper });
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    expect(
      result.current.summary.byStage.find(({ name }) => name === 'finished')
        ?.count,
    ).toBe(30);
  });

  it('keeps mixed populations additive without using the filtered table rows', async () => {
    active = 4;
    const { result } = renderHook(() => usePage(filters('completed')), {
      wrapper,
    });
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    expect(
      result.current.summary.byStage.reduce(
        (total, stage) => total + stage.count,
        0,
      ),
    ).toBe(34);
    expect(
      result.current.summary.byStage.find(({ name }) => name === 'running')
        ?.count,
    ).toBe(4);
    expect(result.current.summary.matchingCount?.count).toBe(30);
  });

  it('does not publish a zero total when breakdowns finish before stage counts', async () => {
    const gate = deferred();
    api.request.mockImplementation(async (path, body) => {
      if (body.view === 'stages') await gate.promise;
      return execute(path, body);
    });
    const { result } = renderHook(() => usePage(filters('all')), { wrapper });
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.summary.isLoading).toBe(true);
    expect(result.current.summary.matchingCount).toBeUndefined();
    await act(async () => gate.resolve());
    await waitFor(() =>
      expect(result.current.summary.matchingCount?.count).toBe(30),
    );
  });

  it('retains known counts when a background refresh fails and recovers on retry', async () => {
    const { result } = renderHook(() => usePage(filters('all')), { wrapper });
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    api.request.mockRejectedValue(new Error('Connection interrupted'));
    act(() => result.current.summary.refresh());
    await waitFor(() => expect(result.current.summary.isError).toBe(true));
    expect(
      result.current.summary.byStage.find(({ name }) => name === 'finished')
        ?.count,
    ).toBe(30);
    api.request.mockImplementation(execute);
    act(() => result.current.summary.refresh());
    await waitFor(() => expect(result.current.summary.isError).toBe(false));
    expect(result.current.summary.matchingCount?.count).toBe(30);
  });

  it('keeps a failed stage request unavailable even if the list returned rows', async () => {
    api.request.mockImplementation(async (path, body) => {
      if (body.view === 'stages') throw new Error('Counts unavailable');
      return execute(path, body);
    });
    const { result } = renderHook(() => usePage(filters('all')), { wrapper });
    await waitFor(() => expect(result.current.summary.isError).toBe(true));
    expect(result.current.summary.matchingCount).toBeUndefined();
    expect(result.current.summary.byStage).toEqual([]);
  });

  it('does not interpret an empty outcome sample as no completed invocations', async () => {
    api.request.mockImplementation(async (path, body) => {
      const result = await execute(path, body);
      if (body.view !== 'all' && body.view !== 'breakdowns') return result;
      return {
        ...result,
        isPartial: true,
        statusBuckets: result.statusBuckets.map(
          (bucket: { count: number }) => ({ ...bucket, count: 0 }),
        ),
        stageBuckets: result.stageBuckets.map((bucket: { count: number }) => ({
          ...bucket,
          count: 0,
          breakdownIsPartial: true,
        })),
      };
    });
    const { result } = renderHook(() => usePage(filters('all'), 'estimate'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    expect(
      result.current.summary.byStage.find(({ name }) => name === 'finished'),
    ).toMatchObject({ count: 30, breakdownIsPartial: true });
    expect(result.current.summary.matchingCount).toEqual({
      count: 30,
      isPartial: false,
    });
  });

  it('does not apply a late response for a previously selected service', async () => {
    const gate = deferred();
    api.request.mockImplementation(async (path, body) => {
      if (JSON.stringify(body.filters).includes('AgentSession'))
        await gate.promise;
      return execute(path, body);
    });
    const { result, rerender } = renderHook(
      ({ service }) => usePage(filters('all', service)),
      {
        initialProps: { service: 'AgentSession' },
        wrapper,
      },
    );
    rerender({ service: 'Other' });
    await waitFor(() =>
      expect(result.current.summary.matchingCount?.count).toBe(7),
    );
    await act(async () => gate.resolve());
    await waitFor(() => expect(result.current.summary.isFetching).toBe(false));
    expect(result.current.summary.matchingCount?.count).toBe(7);
    expect(
      result.current.summary.byStatus.find(({ name }) => name === 'succeeded')
        ?.count,
    ).toBe(7);
  });
});
