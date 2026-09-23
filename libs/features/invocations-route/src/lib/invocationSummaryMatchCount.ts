import {
  TERMINAL_INVOCATION_STATUSES,
  type components,
} from '@restate/data-access/admin-api-spec';
import { hasStatusFilter, type StatusFilter } from './statusFilter';

type InvocationSummary = components['schemas']['SummaryInvocationsV2Response'];
type StatusBucket = Pick<
  components['schemas']['InvocationStatusSummaryBucketV2'],
  'statuses' | 'count'
>;

export type InvocationSummaryMatchCount = {
  count: number;
  isPartial: boolean;
};

export type InvocationPopulationCount = {
  count: number;
  accuracy: 'exact' | 'estimate' | 'lower-bound';
};

type InvocationListSnapshot = {
  listIsAvailable: boolean;
  listRowCount: number;
  listLimit: number;
  listIsPartial: boolean;
};

export function isInvocationListSnapshotComplete({
  summaryMatchCount,
  listIsAvailable,
  listRowCount,
  listLimit,
  listIsPartial,
}: {
  summaryMatchCount: InvocationSummaryMatchCount | undefined;
} & InvocationListSnapshot) {
  const listIsCapped = listLimit > 0 && listRowCount >= listLimit;
  if (!listIsAvailable || listIsPartial || listIsCapped) return false;

  const summaryExceedsListCapacity =
    listLimit > 0 &&
    summaryMatchCount !== undefined &&
    summaryMatchCount.count >= listLimit &&
    summaryMatchCount.count > listRowCount;
  return !summaryExceedsListCapacity;
}

function statusMatches(status: string, filter: StatusFilter) {
  if (!hasStatusFilter(filter)) return true;
  const selected = filter.value.includes(status);
  return filter.operation === 'IN' ? selected : !selected;
}

export function countMatchingStatusBuckets(
  buckets: StatusBucket[],
  populationStatuses: string[],
  statusFilter: StatusFilter,
) {
  const population = new Set(populationStatuses);
  const represented = new Set<string>();
  let count = 0;

  for (const bucket of buckets) {
    if (bucket.statuses.some((status) => !population.has(status))) {
      return undefined;
    }
    for (const status of bucket.statuses) {
      if (represented.has(status)) return undefined;
      represented.add(status);
    }

    const matchingStatuses = bucket.statuses.filter((status) =>
      statusMatches(status, statusFilter),
    );
    if (
      matchingStatuses.length > 0 &&
      matchingStatuses.length < bucket.statuses.length
    ) {
      return undefined;
    }
    if (matchingStatuses.length === bucket.statuses.length) {
      count += bucket.count;
    }
  }

  if (populationStatuses.some((status) => !represented.has(status))) {
    return undefined;
  }
  return count;
}

export function filterInvocationSummaryByStatus<
  StageBucket extends { count: number; statuses: string[] },
  StatusBucket extends { count: number; statuses: string[] },
>(stages: StageBucket[], statuses: StatusBucket[], statusFilter: StatusFilter) {
  if (!hasStatusFilter(statusFilter)) {
    return { byStage: stages, byStatus: statuses, usesBreakdown: false };
  }

  const byStatus = statuses.map((bucket) =>
    bucket.statuses.every((status) => statusMatches(status, statusFilter))
      ? bucket
      : { ...bucket, count: 0 },
  );
  let usesBreakdown = false;
  const byStage = stages.map((stage) => {
    const matchingStatuses = stage.statuses.filter((status) =>
      statusMatches(status, statusFilter),
    );
    if (matchingStatuses.length === 0) return { ...stage, count: 0 };
    if (matchingStatuses.length < stage.statuses.length) usesBreakdown = true;
    if (matchingStatuses.length === stage.statuses.length) return stage;

    const stageStatuses = new Set(stage.statuses);
    return {
      ...stage,
      count: byStatus
        .filter((bucket) =>
          bucket.statuses.every((status) => stageStatuses.has(status)),
        )
        .reduce((count, bucket) => count + bucket.count, 0),
    };
  });

  return { byStage, byStatus, usesBreakdown };
}

export function countMatchingGlobalStatuses(
  summary: InvocationSummary,
  statusFilter: StatusFilter,
): InvocationSummaryMatchCount | undefined {
  if (
    !summary.stageBuckets.some(({ key }) => key === 'finished') &&
    TERMINAL_INVOCATION_STATUSES.some((status) =>
      statusMatches(status, statusFilter),
    )
  )
    return undefined;
  let count = 0;
  let isPartial = summary.stageCountsArePartial;

  for (const stage of summary.stageBuckets) {
    const matchingStatuses = stage.statuses.filter((status) =>
      statusMatches(status, statusFilter),
    );
    if (matchingStatuses.length === 0) continue;
    if (matchingStatuses.length === stage.statuses.length) {
      count += stage.count;
      continue;
    }

    const stageStatuses = new Set(stage.statuses);
    if (stage.breakdownCoverage === 'missing') return undefined;
    const stageBuckets = summary.statusBuckets.filter((bucket) =>
      bucket.statuses.every((status) => stageStatuses.has(status)),
    );
    const stageCount = countMatchingStatusBuckets(
      stageBuckets,
      stage.statuses,
      statusFilter,
    );
    if (stageCount === undefined) return undefined;
    count += stageCount;
    isPartial ||= stage.breakdownIsPartial;
  }

  return isPartial && count === 0 ? undefined : { count, isPartial };
}

export function resolveInvocationPopulationCount({
  summaryMatchCount,
  listIsAvailable,
  listRowCount,
  listLimit,
  listIsPartial,
}: {
  summaryMatchCount: InvocationSummaryMatchCount | undefined;
} & InvocationListSnapshot): InvocationPopulationCount {
  const listSnapshotIsComplete = isInvocationListSnapshotComplete({
    summaryMatchCount,
    listIsAvailable,
    listRowCount,
    listLimit,
    listIsPartial,
  });
  if (listSnapshotIsComplete) {
    return { count: listRowCount, accuracy: 'exact' };
  }

  if (summaryMatchCount) {
    return {
      count: summaryMatchCount.count,
      accuracy: summaryMatchCount.isPartial ? 'estimate' : 'exact',
    };
  }

  return {
    count: listRowCount,
    accuracy: 'lower-bound',
  };
}
