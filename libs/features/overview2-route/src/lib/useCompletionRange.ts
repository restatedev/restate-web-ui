import { useMemo, useState } from 'react';
import { useFinishedInvocationsBreakdownV2 } from '@restate/data-access/admin-api-hooks';
import { getOverviewRefreshMeta } from '@restate/data-access/admin-api';
import type { BreakdownCountMode } from '@restate/features/user-preference';
import {
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
  summaryBreakdownIsLoading?: boolean;
  summaryIsPartial?: boolean;
  summaryIsExact?: boolean;
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
  summaryBreakdownIsLoading = false,
  summaryIsPartial = false,
  summaryIsExact = false,
  enabled = true,
  timeRange: controlledTimeRange,
}: UseCompletionRangeArgs) {
  const [selectedTimeRange, setTimeRange] = useState<CompletionTimeRange>();
  const timeRange =
    controlledTimeRange ??
    selectedTimeRange ??
    (hasCompletePopulation ? 'ALL' : 'PT1H');
  const usesSummary = enabled && reuseSummaryForOverall && timeRange === 'ALL';
  const usesBreakdown = enabled && !usesSummary;
  const rangeStartTime = usesBreakdown
    ? getCompletionRangeStartTime(timeRange)
    : undefined;

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
  const rangeBucket = usesBreakdown ? queriedBucket : undefined;
  const isSampled =
    (usesBreakdown || (usesSummary && !summaryIsExact)) &&
    canSampleBreakdown &&
    breakdownMode === 'estimate';
  const isPartial = usesSummary
    ? summaryIsPartial
    : usesBreakdown && Boolean(breakdown.data?.isPartial);

  return {
    usesSummary,
    usesBreakdown,
    timeRange,
    setTimeRange,
    rangeBucket,
    isSampled,
    isPartial,
    isLoading: usesSummary
      ? summaryBreakdownIsLoading
      : usesBreakdown
        ? breakdown.isPending
        : false,
    isError: enabled && usesBreakdown ? breakdown.isError : false,
  };
}
