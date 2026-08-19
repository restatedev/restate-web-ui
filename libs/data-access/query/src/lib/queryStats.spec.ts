import { registerTransientQueryParams } from '@restate/util/panel';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearQueryStats,
  describeQueryPage,
  getQueryStatsSnapshot,
  normalizeQueryPage,
  recordQuery,
  subscribeToQueryStats,
} from './queryStats';

function record(
  overrides: Partial<Parameters<typeof recordQuery>[0]> = {},
): void {
  recordQuery({
    id: 'invocations/get',
    sql: 'SELECT 1',
    durationMs: 100,
    outcome: 'success',
    executedAt: 1_000,
    page: { key: '/invocations', href: '/ui/invocations' },
    ...overrides,
  });
}

describe('queryStats', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { origin: 'http://query-stats.test' },
      addEventListener: vi.fn(),
    });
    clearQueryStats();
  });

  it('aggregates executions of the same query id into one row', () => {
    const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    durations.forEach((durationMs, index) =>
      record({ durationMs, executedAt: 1_000 + index }),
    );

    const [stat] = getQueryStatsSnapshot();
    expect(stat).toMatchObject({
      id: 'invocations/get',
      count: 10,
      p50: 500,
      p90: 900,
      timeouts: 0,
      errors: 0,
      aborted: 0,
      lastExecutedAt: 1_009,
    });
    expect(stat?.max).toMatchObject({ durationMs: 1000, timedOut: false });
    expect(stat?.description).toBeTruthy();
    expect(stat?.shape).toContain('FROM sys_invocation');
    expect(stat?.tables).toContain('sys_invocation');
  });

  it('keeps the SQL and page of the slowest execution', () => {
    record({ sql: 'SELECT fast', durationMs: 10 });
    record({
      sql: 'SELECT slow',
      durationMs: 5_000,
      page: { key: '/overview', href: '/ui/overview' },
    });
    record({ sql: 'SELECT medium', durationMs: 300 });

    const [stat] = getQueryStatsSnapshot();
    expect(stat?.max).toEqual({
      sql: 'SELECT slow',
      durationMs: 5_000,
      executedAt: 1_000,
      page: '/overview',
      pageHref: '/ui/overview',
      timedOut: false,
    });
  });

  it('lets timeouts enter the duration stats and claim the max slot', () => {
    record({ durationMs: 100 });
    record({ sql: 'SELECT stuck', durationMs: 600_000, outcome: 'timeout' });

    const [stat] = getQueryStatsSnapshot();
    expect(stat).toMatchObject({ count: 2, timeouts: 1 });
    expect(stat?.max).toMatchObject({
      sql: 'SELECT stuck',
      durationMs: 600_000,
      timedOut: true,
    });
  });

  it('excludes aborted and errored executions from duration stats', () => {
    record({ durationMs: 100 });
    record({ durationMs: 9_999, outcome: 'aborted' });
    record({ durationMs: 9_999, outcome: 'error' });

    const [stat] = getQueryStatsSnapshot();
    expect(stat).toMatchObject({
      count: 3,
      p50: 100,
      p90: 100,
      errors: 1,
      aborted: 1,
    });
    expect(stat?.max?.durationMs).toBe(100);
  });

  it('counts executions per page with a linkable example URL', () => {
    record({ page: { key: '/invocations', href: '/ui/invocations?a=1' } });
    record({ page: { key: '/overview', href: '/ui/overview' } });
    record({ page: { key: '/overview', href: '/ui/overview?b=2' } });
    record({ page: undefined });

    const [stat] = getQueryStatsSnapshot();
    expect(stat?.pages).toEqual([
      { page: '/overview', count: 2, href: '/ui/overview?b=2' },
      { page: '/invocations', count: 1, href: '/ui/invocations?a=1' },
      { page: 'unknown', count: 1 },
    ]);
  });

  it('returns a stable snapshot reference until the next record', () => {
    record();
    const first = getQueryStatsSnapshot();
    expect(getQueryStatsSnapshot()).toBe(first);
    record();
    expect(getQueryStatsSnapshot()).not.toBe(first);
  });

  it('notifies subscribers on record and clear', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToQueryStats(listener);
    record();
    clearQueryStats();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getQueryStatsSnapshot()).toEqual([]);
    unsubscribe();
    record();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('isolates in-memory stats by admin base URL', () => {
    const firstBaseUrl = 'https://admin.first.example';
    const secondBaseUrl = 'https://admin.second.example';
    record({ baseUrl: firstBaseUrl, sql: 'SELECT first', durationMs: 100 });
    record({ baseUrl: secondBaseUrl, sql: 'SELECT second', durationMs: 900 });

    expect(getQueryStatsSnapshot(firstBaseUrl)[0]?.max).toMatchObject({
      sql: 'SELECT first',
      durationMs: 100,
    });
    expect(getQueryStatsSnapshot(secondBaseUrl)[0]?.max).toMatchObject({
      sql: 'SELECT second',
      durationMs: 900,
    });

    clearQueryStats(firstBaseUrl);
    expect(getQueryStatsSnapshot(firstBaseUrl)).toEqual([]);
    expect(getQueryStatsSnapshot(secondBaseUrl)).toHaveLength(1);
    clearQueryStats(secondBaseUrl);
  });

  it('does not retain query stats during server rendering', () => {
    vi.stubGlobal('window', undefined);
    record({ baseUrl: 'https://admin.server.example' });
    expect(getQueryStatsSnapshot('https://admin.server.example')).toEqual([]);
  });
});

describe('normalizeQueryPage', () => {
  it('collapses invocation ids and long tokens into :id', () => {
    expect(normalizeQueryPage('/invocations/inv_10BZTy1lF2Hz5A2A')).toBe(
      '/invocations/:id',
    );
    expect(
      normalizeQueryPage(
        '/flow-control/vqueues/9f8e7d6c5b4a39281706f5e4d3c2b1a0',
      ),
    ).toBe('/flow-control/vqueues/:id');
  });

  it('keeps short static segments as they are', () => {
    expect(normalizeQueryPage('/state/counter')).toBe('/state/counter');
    expect(normalizeQueryPage('/')).toBe('/');
  });
});

describe('describeQueryPage', () => {
  it('returns the plain page when no surface is open', () => {
    expect(describeQueryPage('/invocations', '?filters=x')).toBe(
      '/invocations',
    );
  });

  it('appends the active panel from the URL', () => {
    expect(
      describeQueryPage('/invocations', '?invocation=inv_1&panel=invocation'),
    ).toBe('/invocations · panel:invocation');
  });

  it('appends registered dialog params present in the URL', () => {
    registerTransientQueryParams('servicePlayground');
    expect(describeQueryPage('/overview', '?servicePlayground=Greeter')).toBe(
      '/overview · dialog:servicePlayground',
    );
  });

  it('appends mounted dialog surfaces, unnamed ones as a plain marker', () => {
    expect(describeQueryPage('/state/counter', '', ['edit-state'])).toBe(
      '/state/counter · dialog:edit-state',
    );
    expect(describeQueryPage('/state/counter', '', ['dialog'])).toBe(
      '/state/counter · dialog',
    );
    expect(
      describeQueryPage('/state/counter', '', ['dialog', 'edit-state']),
    ).toBe('/state/counter · dialog:edit-state');
    expect(describeQueryPage('/state/counter', '', [])).toBe('/state/counter');
  });
});

describe('persistence', () => {
  function createStorageStub(): Storage {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    };
  }

  async function importFreshModule(local: Storage, session: Storage) {
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('window', {
      location: { origin: 'http://query-stats.test' },
      addEventListener: vi.fn(),
    });
    vi.resetModules();
    return import('./queryStats');
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('rehydrates the tab bucket after a reload', async () => {
    const local = createStorageStub();
    const session = createStorageStub();

    const first = await importFreshModule(local, session);
    first.recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 100,
      outcome: 'success',
      executedAt: 1_000,
      page: { key: '/invocations', href: '/ui/invocations' },
    });
    first.flushQueryStats();

    const reloaded = await importFreshModule(local, session);
    const [stat] = reloaded.getQueryStatsSnapshot();
    expect(stat).toMatchObject({
      id: 'invocations/get',
      count: 1,
      p50: 100,
    });
  });

  it('merges buckets written by other tabs into the snapshot', async () => {
    const local = createStorageStub();

    const otherTab = await importFreshModule(local, createStorageStub());
    otherTab.recordQuery({
      id: 'invocations/get',
      sql: 'SELECT other',
      durationMs: 900,
      outcome: 'success',
      executedAt: 2_000,
      page: { key: '/overview', href: '/ui/overview' },
    });
    otherTab.flushQueryStats();

    const thisTab = await importFreshModule(local, createStorageStub());
    thisTab.recordQuery({
      id: 'invocations/get',
      sql: 'SELECT mine',
      durationMs: 100,
      outcome: 'success',
      executedAt: 3_000,
      page: { key: '/invocations', href: '/ui/invocations' },
    });

    const [stat] = thisTab.getQueryStatsSnapshot();
    expect(stat).toMatchObject({ count: 2, lastExecutedAt: 3_000 });
    expect(stat?.max).toMatchObject({ sql: 'SELECT other', durationMs: 900 });
    expect(stat?.pages).toHaveLength(2);
  });

  it('keeps persisted buckets isolated by admin base URL', async () => {
    const local = createStorageStub();
    const session = createStorageStub();
    const firstBaseUrl = 'https://admin.first.example';
    const secondBaseUrl = 'https://admin.second.example';

    const first = await importFreshModule(local, session);
    first.recordQuery({
      id: 'invocations/get',
      sql: 'SELECT first',
      durationMs: 100,
      outcome: 'success',
      executedAt: 1_000,
      baseUrl: firstBaseUrl,
    });
    first.recordQuery({
      id: 'invocations/get',
      sql: 'SELECT second',
      durationMs: 900,
      outcome: 'success',
      executedAt: 2_000,
      baseUrl: secondBaseUrl,
    });
    first.flushQueryStats();

    const reloaded = await importFreshModule(local, session);
    expect(reloaded.getQueryStatsSnapshot(firstBaseUrl)[0]?.max).toMatchObject({
      sql: 'SELECT first',
      durationMs: 100,
    });
    expect(reloaded.getQueryStatsSnapshot(secondBaseUrl)[0]?.max).toMatchObject(
      {
        sql: 'SELECT second',
        durationMs: 900,
      },
    );
  });
});
