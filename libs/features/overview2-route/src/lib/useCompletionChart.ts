import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { CompletionBucketOutcome } from '@restate/features/completion-history';
import { useRestateContext } from '@restate/features/restate-context';
import { toCompletedInvocationsBucketHref } from '@restate/util/invocation-links';
import { createCompletionChartModel } from './completionChartModel';
import { useOverviewContext } from './OverviewContext';
import { useCompletionRange } from './useCompletionRange';

export function useCompletionChart() {
  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();
  const {
    byStage,
    byStatus,
    hasVqueues,
    hasCompleteVqueuePopulation,
    timeRange,
    breakdownMode,
    canSampleBreakdown,
    isCompletedBreakdownLoading,
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
        useSummaryTotals: !hasVqueues,
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
    ],
  );
  const onBucketClick = useCallback(
    (
      bucket: { start: string; end: string },
      outcome: CompletionBucketOutcome,
    ) => {
      navigate(
        toCompletedInvocationsBucketHref(baseUrl, {
          start: bucket.start,
          end: bucket.end,
          outcome,
          existingParams: linkParams,
        }),
      );
    },
    [baseUrl, linkParams, navigate],
  );

  return {
    isHistoryEnabled: range.isHistoryEnabled,
    timeRange: range.timeRange,
    setTimeRange: range.setTimeRange,
    historyBuckets: range.historyBuckets,
    isHistoryLoading: range.isHistoryLoading,
    segments: model.segments,
    total: model.total,
    successRateLabel: model.successRateLabel,
    isSampled: range.isSampled,
    isLoading: isSummaryLoading || range.isLoading,
    isRangeError: range.isError,
    isError: isSummaryError || range.isError,
    label: model.label,
    sublabel: model.sublabel,
    isEmpty: !range.isLoading && !range.isError && model.total === 0,
    href: model.href,
    onBucketClick,
    isSummaryBreakdownLoading: isCompletedBreakdownLoading,
  };
}
