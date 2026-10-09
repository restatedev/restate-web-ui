import { describe, expect, it } from 'vitest';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  countMatchingStatusBuckets,
  doInvocationCountsDisagree,
  filterInvocationSummaryByStatus,
  getListRowCounts,
  isInvocationListSnapshotComplete,
  resolveInvocationPopulationCount,
} from './invocationSummaryMatchCount';

const buckets: Pick<
  components['schemas']['InvocationStatusSummaryBucketV2'],
  'statuses' | 'count'
>[] = [
  {
    statuses: ['pending', 'backing-off'],
    count: 50,
  },
  {
    statuses: ['succeeded'],
    count: 10,
  },
];

describe('countMatchingStatusBuckets', () => {
  it('counts filters aligned with complete buckets', () => {
    expect(
      countMatchingStatusBuckets(
        buckets,
        ['pending', 'backing-off', 'succeeded'],
        {
          field: 'status',
          type: 'STRING_LIST',
          operation: 'NOT_IN',
          value: ['succeeded'],
        },
      ),
    ).toBe(50);
  });

  it('does not invent a count when a filter splits a grouped bucket', () => {
    expect(
      countMatchingStatusBuckets(
        buckets,
        ['pending', 'backing-off', 'succeeded'],
        {
          field: 'status',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['backing-off'],
        },
      ),
    ).toBeUndefined();
  });
});

describe('resolveInvocationPopulationCount', () => {
  it('uses an exact uncapped list instead of a stale summary count', () => {
    expect(
      resolveInvocationPopulationCount({
        summaryMatchCount: { count: 1, isPartial: false },
        listIsAvailable: true,
        listRowCount: 0,
        listLimit: 1000,
        listIsPartial: false,
      }),
    ).toEqual({ count: 0, accuracy: 'exact' });
  });

  it('uses the summary count for a partial list', () => {
    expect(
      resolveInvocationPopulationCount({
        summaryMatchCount: { count: 10, isPartial: true },
        listIsAvailable: true,
        listRowCount: 2,
        listLimit: 1000,
        listIsPartial: true,
      }),
    ).toEqual({ count: 10, accuracy: 'estimate' });
  });

  it('uses the summary count for a capped list', () => {
    expect(
      resolveInvocationPopulationCount({
        summaryMatchCount: { count: 1200, isPartial: false },
        listIsAvailable: true,
        listRowCount: 1000,
        listLimit: 1000,
        listIsPartial: false,
      }),
    ).toEqual({ count: 1200, accuracy: 'exact' });
  });

  it('rejects a short page that contradicts a summary larger than the list capacity', () => {
    const snapshot = {
      summaryMatchCount: { count: 2_590_000, isPartial: false },
      listIsAvailable: true,
      listRowCount: 243,
      listLimit: 250,
      listIsPartial: false,
    };

    expect(isInvocationListSnapshotComplete(snapshot)).toBe(false);
    expect(resolveInvocationPopulationCount(snapshot)).toEqual({
      count: 2_590_000,
      accuracy: 'exact',
    });
  });
});

describe('getListRowCounts', () => {
  it('excludes rows whose status changed while loading', () => {
    expect(
      getListRowCounts({
        rows: [{ id: 'inv_1' }, { id: 'inv_2' }, { id: 'inv_3' }],
        statusChangedInvocationIds: ['inv_2'],
      }),
    ).toEqual({ statusChangedCount: 1, matchingRowCount: 2 });
  });

  it('counts nothing before the list loads', () => {
    expect(getListRowCounts(undefined)).toEqual({
      statusChangedCount: 0,
      matchingRowCount: 0,
    });
  });
});

describe('doInvocationCountsDisagree', () => {
  const settledEmptyList = {
    isSettled: true,
    statusChangedCount: 0,
    summaryMatchCount: { count: 1, isPartial: false },
    listIsAvailable: true,
    listRowCount: 0,
    listLimit: 250,
    listIsPartial: false,
  };

  it('flags an exact count that contradicts a complete list', () => {
    expect(doInvocationCountsDisagree(settledEmptyList)).toBe(true);
  });

  it('flags a non-zero estimate only when the complete list is empty', () => {
    expect(
      doInvocationCountsDisagree({
        ...settledEmptyList,
        summaryMatchCount: { count: 1, isPartial: true },
      }),
    ).toBe(true);
    expect(
      doInvocationCountsDisagree({
        ...settledEmptyList,
        summaryMatchCount: { count: 5, isPartial: true },
        listRowCount: 3,
      }),
    ).toBe(false);
  });

  it('ignores partial or capped lists and requests in flight', () => {
    expect(
      doInvocationCountsDisagree({ ...settledEmptyList, listIsPartial: true }),
    ).toBe(false);
    expect(
      doInvocationCountsDisagree({
        ...settledEmptyList,
        summaryMatchCount: { count: 300, isPartial: false },
        listRowCount: 250,
      }),
    ).toBe(false);
    expect(
      doInvocationCountsDisagree({ ...settledEmptyList, isSettled: false }),
    ).toBe(false);
  });

  it('defers to the status-changed notice when rows changed status', () => {
    expect(
      doInvocationCountsDisagree({
        ...settledEmptyList,
        statusChangedCount: 1,
      }),
    ).toBe(false);
  });
});

describe('filterInvocationSummaryByStatus', () => {
  const stages = [
    { name: 'inbox', count: 100, statuses: ['pending', 'backing-off'] },
    { name: 'running', count: 5, statuses: ['running'] },
    { name: 'finished', count: 10, statuses: ['succeeded'] },
  ];
  const statuses = [
    { name: 'pending', count: 90, statuses: ['pending'] },
    { name: 'backing-off', count: 10, statuses: ['backing-off'] },
    { name: 'running', count: 5, statuses: ['running'] },
    { name: 'succeeded', count: 10, statuses: ['succeeded'] },
  ];

  it('makes every bucket part of the same current-match population', () => {
    const result = filterInvocationSummaryByStatus(stages, statuses, {
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: ['backing-off', 'running'],
    });

    expect(result.byStage.map(({ count }) => count)).toEqual([10, 5, 0]);
    expect(result.byStatus.map(({ count }) => count)).toEqual([0, 10, 5, 0]);
    expect(result.usesBreakdown).toBe(true);
  });

  it('keeps whole selected stages on their exact stage counts', () => {
    const result = filterInvocationSummaryByStatus(stages, statuses, {
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: ['pending', 'backing-off', 'running'],
    });

    expect(result.byStage.map(({ count }) => count)).toEqual([100, 5, 0]);
    expect(result.usesBreakdown).toBe(false);
  });
});
