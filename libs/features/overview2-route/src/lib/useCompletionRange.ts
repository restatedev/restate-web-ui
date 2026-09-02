import { useMemo, useState } from 'react';
import {
  useFinishedInvocationsBreakdownV2,
  useFinishedInvocationsTimelineV2,
} from '@restate/data-access/admin-api-hooks';
import { getOverviewRefreshMeta } from '@restate/data-access/admin-api';
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
  reuseSummaryForOverall?: boolean;
  summaryIsPartial?: boolean;
  enabled?: boolean;
  timeRange?: CompletionTimeRange;
};

const OVERVIEW_REFRESH_META = getOverviewRefreshMeta();

export function useCompletionRange({
  hasCompletePopulation,
  breakdownMode,
  canSampleBreakdown,
  refetchInterval,
  reuseSummaryForOverall = false,
  summaryIsPartial = false,
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
  const usesSummary =
    enabled &&
    !isHistoryEnabled &&
    reuseSummaryForOverall &&
    timeRange === 'ALL';
  const usesBreakdown = enabled && !isHistoryEnabled && !usesSummary;
  const rangeStartTime = usesBreakdown
    ? getCompletionRangeStartTime(timeRange)
    : undefined;

  const { buckets: historyBuckets, isPending: isHistoryLoading } =
    useFinishedInvocationsTimelineV2({
      refetchInterval,
      enabled: isHistoryEnabled,
      liveQueryMeta: OVERVIEW_REFRESH_META,
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
      meta: OVERVIEW_REFRESH_META,
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
        isHistoryEnabled
          ? historyBuckets
          : usesBreakdown && queriedBucket
            ? [queriedBucket]
            : [],
      ),
    [historyBuckets, isHistoryEnabled, queriedBucket, usesBreakdown],
  );
  const isSampled =
    (usesBreakdown || usesSummary) &&
    canSampleBreakdown &&
    breakdownMode === 'estimate';
  const isPartial = usesSummary
    ? summaryIsPartial
    : usesBreakdown && Boolean(breakdown.data?.isPartial);

  return {
    isHistoryEnabled,
    usesSummary,
    timeRange,
    setTimeRange,
    historyBuckets,
    isHistoryLoading,
    rangeBucket,
    isSampled,
    isPartial,
    isLoading: isHistoryEnabled
      ? isHistoryLoading
      : usesBreakdown
        ? breakdown.isPending
        : false,
    isError: enabled && usesBreakdown ? breakdown.isError : false,
  };
}
