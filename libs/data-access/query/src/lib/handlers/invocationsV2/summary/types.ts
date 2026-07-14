import type { InvocationStatus } from '../../../invocationStatuses';
import type { InvocationSummaryStageV2 } from '../shared';

export type InvocationStatusSummaryBucket = {
  key: string;
  label: string;
  statuses: InvocationStatus[];
  count: number;
};

export type InvocationStageSummaryBucket = {
  key: InvocationSummaryStageV2;
  label: string;
  statuses: InvocationStatus[];
  count: number;
  breakdownIsPartial: boolean;
  breakdownCoverage: 'full' | 'coarse' | 'missing';
  breakdownCanRefine: boolean;
};

export type InvocationServiceSummaryBucket = {
  service: string;
  count: number;
  statusBuckets: InvocationStatusSummaryBucket[];
};

export type InvocationSummaryQueryResult = {
  stageBuckets: InvocationStageSummaryBucket[];
  stageCountsArePartial: boolean;
  statusBuckets: InvocationStatusSummaryBucket[];
  serviceBuckets: InvocationServiceSummaryBucket[];
  isPartial: boolean;
};
