import { describe, expect, it } from 'vitest';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  canReconcileStatusFacetFromList,
  countMatchingStatusBuckets,
  resolveInvocationPopulationCount,
  withInvocationStatusCounts,
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

describe('canReconcileStatusFacetFromList', () => {
  it('does not replace the status population with rows narrowed by status', () => {
    expect(
      canReconcileStatusFacetFromList({
        field: 'status',
        type: 'STRING_LIST',
        operation: 'IN',
        value: ['running'],
      }),
    ).toBe(false);
  });

  it('allows exact list reconciliation without a status filter', () => {
    expect(canReconcileStatusFacetFromList(undefined)).toBe(true);
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
});

describe('withInvocationStatusCounts', () => {
  it('replaces summary bucket counts with complete-list status counts', () => {
    expect(
      withInvocationStatusCounts(
        [
          { count: 10, statuses: ['pending', 'backing-off'] },
          { count: 5, statuses: ['running'] },
          { count: 3, statuses: ['succeeded'] },
        ],
        ['running', 'running', 'succeeded'],
      ).map(({ count }) => count),
    ).toEqual([0, 2, 1]);
  });

  it('reconciles selected buckets without replacing sibling populations', () => {
    expect(
      withInvocationStatusCounts(
        [
          { count: 100, statuses: ['pending', 'backing-off'] },
          { count: 6, statuses: ['running'] },
          { count: 1, statuses: ['paused'] },
        ],
        ['running', 'running', 'running', 'running', 'running'],
        {
          field: 'status',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['running'],
        },
      ).map(({ count }) => count),
    ).toEqual([100, 5, 1]);
  });

  it('keeps a grouped population when the status filter selects only part of it', () => {
    expect(
      withInvocationStatusCounts(
        [{ count: 100, statuses: ['pending', 'backing-off'] }],
        ['backing-off'],
        {
          field: 'status',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['backing-off'],
        },
      )[0]?.count,
    ).toBe(100);
  });
});
