import { useMemo, useState } from 'react';
import {
  useFinishedInvocationsBreakdownV2,
  useFinishedInvocationsTimelineV2,
} from '@restate/data-access/admin-api-hooks';
import type { BreakdownCountMode } from '@restate/features/user-preference';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import {
  combineCompletionBuckets,
  createCompletionBucket,
  getCompletionRangeStartTime,
  type CompletionTimeRange,
} from './completionBuckets';

type UseCompletionRangeArgs = {
  hasCompletePopulation: boolean;
  breakdownMode: BreakdownCountMode;
  canSampleBreakdown: boolean;
  refetchInterval: () => number;
  enabled?: boolean;
  timeRange?: CompletionTimeRange;
};

export function useCompletionRange({
  hasCompletePopulation,
  breakdownMode,
  canSampleBreakdown,
  refetchInterval,
  enabled = true,
  timeRange: controlledTimeRange,
}: UseCompletionRangeArgs) {
  const [selectedTimeRange, setTimeRange] = useState<CompletionTimeRange>();
  const timeRange =
    controlledTimeRange ??
    selectedTimeRange ??
    (hasCompletePopulation ? 'ALL' : 'PT1H');
  const isHistoryFeatureEnabled = useIsFeatureFlagEnabled(
    'FEATURE_COMPLETION_HISTORY',
  );
  const isHistoryEnabled = enabled && isHistoryFeatureEnabled;
  const usesBreakdown = enabled && !isHistoryEnabled;
  const rangeStartTime = usesBreakdown
    ? getCompletionRangeStartTime(timeRange)
    : undefined;

  const { buckets: historyBuckets, isPending: isHistoryLoading } =
    useFinishedInvocationsTimelineV2({
      refetchInterval,
      enabled: isHistoryEnabled,
    });
  const breakdown = useFinishedInvocationsBreakdownV2(
    {
      mode:
        canSampleBreakdown && breakdownMode === 'estimate'
          ? { type: 'sampled', sampleSize: 1_000_000 }
          : { type: 'exact' },
      ...(rangeStartTime && { startTime: rangeStartTime }),
    },
    {
      refetchInterval,
      enabled: usesBreakdown,
    },
  );

  const queriedBucket = useMemo(
    () =>
      breakdown.data
        ? createCompletionBucket(breakdown.data.outcomes, rangeStartTime)
        : undefined,
    [breakdown.data, rangeStartTime],
  );
  const rangeBucket = useMemo(
    () =>
      combineCompletionBuckets(
        usesBreakdown ? (queriedBucket ? [queriedBucket] : []) : historyBuckets,
      ),
    [historyBuckets, queriedBucket, usesBreakdown],
  );
  const isSampled =
    usesBreakdown && canSampleBreakdown && breakdownMode === 'estimate';
  const isPartial = usesBreakdown && Boolean(breakdown.data?.isPartial);

  return {
    isHistoryEnabled,
    timeRange,
    setTimeRange,
    historyBuckets,
    isHistoryLoading,
    rangeBucket,
    isSampled,
    isPartial,
    isLoading:
      enabled && (usesBreakdown ? breakdown.isPending : isHistoryLoading),
    isError: enabled && usesBreakdown ? breakdown.isError : false,
  };
}
