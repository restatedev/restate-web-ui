import type { CompletionBucketOutcome } from '@restate/features/completion-history';
import {
  buildCompletedSegments,
  splitInvocationTotals,
  type ArcSegment,
  type StatusEntry,
} from '@restate/features/status-chart';
import {
  toCompletedInvocationsBucketHref,
  toCompletedInvocationsHref,
} from '@restate/util/invocation-links';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { getCompletionTotal, type CompletionBucket } from './completionBuckets';

type CompletionChartModelArgs = {
  byStage: StatusEntry[];
  byStatus: StatusEntry[];
  rangeBucket?: CompletionBucket;
  isSampled: boolean;
  isPartial: boolean;
  useSummaryTotals?: boolean;
  baseUrl: string;
  linkParams: URLSearchParams;
};

function isUnsuccessfulGroup(segment: ArcSegment) {
  const statuses = segment.statuses ?? [];
  return statuses.includes('cancelled') && statuses.includes('killed');
}

function getSegmentCount(
  segment: ArcSegment,
  bucket: CompletionBucket,
  total: number,
) {
  if (segment.name === 'finished') return total;
  if (isUnsuccessfulGroup(segment)) {
    return bucket.failed + bucket.cancelled + bucket.killed;
  }
  if (segment.name === 'succeeded') return bucket.succeeded;
  if (segment.name === 'failed') return bucket.failed;
  if (segment.name === 'cancelled') return bucket.cancelled;
  if (segment.name === 'killed') return bucket.killed;
  return 0;
}

function getSegmentOutcome(
  segment: ArcSegment,
): CompletionBucketOutcome | 'completed' | 'unsuccessful' {
  if (segment.name === 'finished') return 'completed';
  if (isUnsuccessfulGroup(segment)) return 'unsuccessful';
  return segment.name as CompletionBucketOutcome;
}

function buildRangeSegments(
  segments: ArcSegment[],
  bucket: CompletionBucket | undefined,
  total: number,
  baseUrl: string,
  linkParams: URLSearchParams,
) {
  if (!bucket) return segments;
  return segments.map((segment) => ({
    ...segment,
    count: getSegmentCount(segment, bucket, total),
    href: toCompletedInvocationsBucketHref(baseUrl, {
      start: bucket.start,
      end: bucket.end,
      outcome: getSegmentOutcome(segment),
      existingParams: linkParams,
    }),
  }));
}

export function createCompletionChartModel({
  byStage,
  byStatus,
  rangeBucket,
  isSampled,
  isPartial,
  useSummaryTotals,
  baseUrl,
  linkParams,
}: CompletionChartModelArgs) {
  const summaryTotals = splitInvocationTotals(byStatus);
  const completedTotal =
    byStage.find((stage) => stage.name === 'finished')?.count ?? 0;
  const total = rangeBucket
    ? getCompletionTotal(rangeBucket)
    : useSummaryTotals
      ? completedTotal
      : 0;
  const baseSegments = buildCompletedSegments(byStatus, baseUrl, linkParams);
  const segments = buildRangeSegments(
    baseSegments,
    rangeBucket,
    total,
    baseUrl,
    linkParams,
  );
  const label =
    summaryTotals.finished > 0
      ? 'Completed'
      : completedTotal > 0
        ? 'Succeeded'
        : 'Completed';
  const succeeded = rangeBucket?.succeeded ?? summaryTotals.succeeded;
  const successRateLabel =
    total > 0
      ? `${isSampled ? '~' : ''}${formatPercentageWithoutFraction(
          succeeded / total,
        )}`
      : undefined;
  const sublabel =
    !isPartial && total > 0
      ? `of ${formatNumber(total, true)} completed`
      : undefined;
  const href = rangeBucket
    ? toCompletedInvocationsBucketHref(baseUrl, {
        start: rangeBucket.start,
        end: rangeBucket.end,
        outcome: 'completed',
        existingParams: linkParams,
      })
    : toCompletedInvocationsHref(baseUrl, { existingParams: linkParams });

  return {
    segments,
    total,
    successRateLabel,
    label,
    sublabel,
    href,
  };
}
