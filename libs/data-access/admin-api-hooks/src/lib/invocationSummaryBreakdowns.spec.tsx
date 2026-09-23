import { describe, expect, it } from 'vitest';
import type { components } from '@restate/data-access/admin-api-spec';
import { alignInvocationSummaryBreakdowns } from './invocationSummaryBreakdowns';

const stage: components['schemas']['InvocationStageSummaryBucketV2'] = {
  key: 'finished',
  label: 'Completed',
  count: 30,
  statuses: ['succeeded', 'failed', 'cancelled', 'killed'],
  isIncluded: true,
  breakdownIsPartial: false,
  breakdownCoverage: 'full',
  breakdownCanRefine: false,
};

function statuses(counts: number[]) {
  return stage.statuses.map((status, index) => ({
    key: status,
    label: status,
    statuses: [status],
    count: counts[index] ?? 0,
    isIncluded: true,
  }));
}

describe('alignInvocationSummaryBreakdowns', () => {
  it('keeps an exact breakdown unchanged when it agrees with its stage', () => {
    const buckets = statuses([21, 5, 3, 1]);
    expect(alignInvocationSummaryBreakdowns([stage], buckets)).toEqual({
      stageBuckets: [stage],
      statusBuckets: buckets,
    });
  });

  it('marks inconsistent snapshots approximate and preserves the stage total after rounding', () => {
    const result = alignInvocationSummaryBreakdowns(
      [{ ...stage, count: 2 }],
      statuses([1, 1, 1]),
    );
    expect(result.stageBuckets[0]?.breakdownIsPartial).toBe(true);
    expect(result.stageBuckets[0]?.count).toBe(2);
    expect(
      result.statusBuckets.reduce((sum, bucket) => sum + bucket.count, 0),
    ).toBe(2);
  });

  it('does not fabricate outcomes from an empty sample', () => {
    const result = alignInvocationSummaryBreakdowns([stage], statuses([]));
    expect(result.stageBuckets[0]).toMatchObject({
      count: 30,
      breakdownIsPartial: true,
    });
    expect(result.statusBuckets.every(({ count }) => count === 0)).toBe(true);
  });

  it('does not show stale positive outcomes for a confirmed empty population', () => {
    const result = alignInvocationSummaryBreakdowns(
      [{ ...stage, count: 0 }],
      statuses([30]),
    );
    expect(result.statusBuckets.every(({ count }) => count === 0)).toBe(true);
    expect(result.stageBuckets[0]?.count).toBe(0);
  });
});
