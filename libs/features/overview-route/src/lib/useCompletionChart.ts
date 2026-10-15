import { useMemo } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import { createCompletionChartModel } from './completionChartModel';
import { useOverviewContext } from './OverviewContext';
import { useCompletionRange } from './useCompletionRange';

export function useCompletionChart() {
  const { baseUrl } = useRestateContext();
  const {
    byStage,
    byStatus,
    hasVqueues,
    hasCompleteVqueuePopulation,
    timeRange,
    breakdownMode,
    canSampleBreakdown,
    isSummaryFromStats,
    isCompletedBreakdownLoading,
    isCompletedBreakdownPartial,
    isSummaryLoading,
    isSummaryError,
    linkParams,
    overviewRefetchInterval,
  } = useOverviewContext();

  const range = useCompletionRange({
    hasCompletePopulation: hasCompleteVqueuePopulation,
    breakdownMode,
    canSampleBreakdown,
    refetchInterval: overviewRefetchInterval,
    reuseSummaryForOverall: hasVqueues,
    summaryBreakdownIsLoading: isCompletedBreakdownLoading,
    summaryIsPartial: isCompletedBreakdownPartial,
    summaryIsExact: isSummaryFromStats,
    enabled: hasVqueues,
    timeRange: hasVqueues ? undefined : timeRange,
  });
  const model = useMemo(
    () =>
      createCompletionChartModel({
        byStage,
        byStatus,
        rangeBucket: range.rangeBucket,
        isSampled: range.isSampled,
        isPartial: range.isPartial,
        useSummaryTotals: !hasVqueues || range.usesSummary,
        baseUrl,
        linkParams,
      }),
    [
      baseUrl,
      byStage,
      byStatus,
      hasVqueues,
      linkParams,
      range.isPartial,
      range.isSampled,
      range.rangeBucket,
      range.usesSummary,
    ],
  );
  return {
    timeRange: range.timeRange,
    setTimeRange: range.setTimeRange,
    segments: model.segments,
    total: model.total,
    successRateLabel: model.successRateLabel,
    isSampled: range.isSampled,
    usesBreakdownMode: range.usesBreakdown,
    isLoading: isSummaryLoading || range.isLoading,
    isRangeError: range.isError,
    isError: isSummaryError || range.isError,
    label: model.label,
    sublabel: model.sublabel,
    isEmpty: !range.isLoading && !range.isError && model.total === 0,
    href: model.href,
    isSummaryBreakdownLoading: isCompletedBreakdownLoading,
  };
}
