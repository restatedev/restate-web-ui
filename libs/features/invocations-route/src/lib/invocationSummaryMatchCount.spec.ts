import { describe, expect, it } from 'vitest';
import type { components } from '@restate/data-access/admin-api-spec';
import { countMatchingStatusBuckets } from './invocationSummaryMatchCount';

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
