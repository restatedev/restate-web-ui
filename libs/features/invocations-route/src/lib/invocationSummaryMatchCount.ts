import type { components } from '@restate/data-access/admin-api-spec';
import { hasStatusFilter, type StatusFilter } from './statusFilter';

type InvocationFilter = components['schemas']['InvocationV2FilterItem'];
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
>(
  stages: StageBucket[],
  statuses: StatusBucket[],
  statusFilter: StatusFilter,
  matchingTotal?: number,
) {
  if (!hasStatusFilter(statusFilter)) {
    return { byStage: stages, byStatus: statuses, usesBreakdown: false };
  }

  const byStatus = statuses.map((bucket) =>
    bucket.statuses.every((status) => statusMatches(status, statusFilter))
      ? bucket
      : { ...bucket, count: 0 },
  );
  const matchingStages = stages.filter((stage) =>
    stage.statuses.some((status) => statusMatches(status, statusFilter)),
  );
  const onlyMatchingStage =
    matchingStages.length === 1 ? matchingStages[0] : undefined;
  let usesBreakdown = false;
  const byStage = stages.map((stage) => {
    const matchingStatuses = stage.statuses.filter((status) =>
      statusMatches(status, statusFilter),
    );
    if (matchingStatuses.length === 0) return { ...stage, count: 0 };
    if (matchingStatuses.length < stage.statuses.length) usesBreakdown = true;
    if (stage === onlyMatchingStage && matchingTotal !== undefined) {
      return { ...stage, count: matchingTotal };
    }
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

  return { count, isPartial };
}

export function getInvocationSummaryMatchCount(
  summary: InvocationSummary | undefined,
  filters: InvocationFilter[] | undefined,
): InvocationSummaryMatchCount | undefined {
  if (!summary) return undefined;

  const statusFilterItem = filters?.find(({ field }) => field === 'status');
  if (statusFilterItem && statusFilterItem.type !== 'STRING_LIST') {
    return undefined;
  }
  const statusFilter = statusFilterItem as StatusFilter;
  const filtersByService = filters?.some(
    ({ field }) => field === 'target_service_name',
  );

  if (!filtersByService) {
    if (!hasStatusFilter(statusFilter)) {
      return {
        count: summary.total,
        isPartial: summary.stageCountsArePartial,
      };
    }
    return countMatchingGlobalStatuses(summary, statusFilter);
  }

  const populationStatuses = summary.stageBuckets.flatMap(
    ({ statuses }) => statuses,
  );
  let count = 0;
  for (const service of summary.serviceBuckets.filter(
    ({ isIncluded }) => isIncluded,
  )) {
    if (!hasStatusFilter(statusFilter)) {
      count += service.count;
      continue;
    }
    const serviceCount = countMatchingStatusBuckets(
      service.statusBuckets,
      populationStatuses,
      statusFilter,
    );
    if (serviceCount === undefined) return undefined;
    count += serviceCount;
  }

  return { count, isPartial: summary.stageCountsArePartial };
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

export function withInvocationStatusCounts<
  Bucket extends { count: number; statuses: string[] },
>(buckets: Bucket[], invocationStatuses: string[]) {
  const statusCounts = new Map<string, number>();
  for (const status of invocationStatuses) {
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  return buckets.map((bucket) => ({
    ...bucket,
    count: bucket.statuses.reduce(
      (count, status) => count + (statusCounts.get(status) ?? 0),
      0,
    ),
  }));
}

export function reconcileCoveredInvocationStatusCounts<
  Bucket extends { count: number; statuses: string[] },
>(buckets: Bucket[], invocationStatuses: string[], statusFilter: StatusFilter) {
  const reconciled = withInvocationStatusCounts(buckets, invocationStatuses);
  return buckets.map((bucket, index) =>
    bucket.statuses.every((status) => statusMatches(status, statusFilter))
      ? (reconciled[index] ?? bucket)
      : bucket,
  );
}
