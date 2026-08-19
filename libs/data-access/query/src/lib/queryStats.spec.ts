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
    page: '/invocations',
    ...overrides,
  });
}

describe('queryStats', () => {
  beforeEach(() => {
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
    expect(stat?.tables).toContain('sys_invocation');
  });

  it('keeps the SQL of the slowest execution', () => {
    record({ sql: 'SELECT fast', durationMs: 10 });
    record({ sql: 'SELECT slow', durationMs: 5_000, page: '/overview' });
    record({ sql: 'SELECT medium', durationMs: 300 });

    const [stat] = getQueryStatsSnapshot();
    expect(stat?.max).toEqual({
      sql: 'SELECT slow',
      durationMs: 5_000,
      executedAt: 1_000,
      page: '/overview',
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

  it('counts executions per page, most frequent first', () => {
    record({ page: '/invocations' });
    record({ page: '/overview' });
    record({ page: '/overview' });
    record({ page: undefined });

    const [stat] = getQueryStatsSnapshot();
    expect(stat?.pages).toEqual([
      { page: '/overview', count: 2 },
      { page: '/invocations', count: 1 },
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
