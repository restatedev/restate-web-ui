import { useMemo, useState } from 'react';
import { useFinishedInvocationsBreakdownV2 } from '@restate/data-access-admin-api-hooks';
import { getOverviewRefreshMeta } from '@restate/data-access-admin-api';
import type { BreakdownCountMode } from '@restate/features-user-preference';
import {
  createCompletionBucket,
  getCompletionRangeStartTime,
  type CompletionTimeRange,
} from './completionBuckets';

type UseCompletionRangeArgs = {
  breakdownMode: BreakdownCountMode;
  refetchInterval: () => number;
  summaryBreakdownIsLoading?: boolean;
  summaryIsPartial?: boolean;
  summaryIsExact?: boolean;
};

const OVERVIEW_REFRESH_META = getOverviewRefreshMeta();

export function useCompletionRange({
  breakdownMode,
  refetchInterval,
  summaryBreakdownIsLoading = false,
  summaryIsPartial = false,
  summaryIsExact = false,
}: UseCompletionRangeArgs) {
  const [selectedTimeRange, setTimeRange] = useState<CompletionTimeRange>();
  const timeRange = selectedTimeRange ?? 'ALL';
  const usesSummary = timeRange === 'ALL';
  const usesBreakdown = !usesSummary;
  const rangeStartTime = usesBreakdown
    ? getCompletionRangeStartTime(timeRange)
    : undefined;

  const breakdown = useFinishedInvocationsBreakdownV2(
    {
      mode:
        breakdownMode === 'estimate'
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
    isLoading: usesSummary ? summaryBreakdownIsLoading : breakdown.isPending,
    isError: usesBreakdown ? breakdown.isError : false,
  };
}
