import type { components } from '@restate/data-access/admin-api-spec';

type Stage = components['schemas']['InvocationStageSummaryBucketV2'];
type Status = components['schemas']['InvocationStatusSummaryBucketV2'];

export function alignInvocationSummaryBreakdowns(
  stages: Stage[],
  statuses: Status[],
) {
  const counts = new Map<Status, number>();
  const stageBuckets = stages.map((stage) => {
    if (stage.breakdownCoverage === 'missing') return stage;
    const buckets = statuses.filter((bucket) =>
      bucket.statuses.every((status) => stage.statuses.includes(status)),
    );
    const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    if (total === stage.count) return stage;

    let cumulative = 0;
    let allocated = 0;
    for (const bucket of buckets) {
      cumulative += bucket.count;
      const next =
        total > 0 ? Math.round((cumulative / total) * stage.count) : 0;
      counts.set(bucket, next - allocated);
      allocated = next;
    }
    return { ...stage, breakdownIsPartial: true };
  });

  return {
    stageBuckets,
    statusBuckets: statuses.map((bucket) => ({
      ...bucket,
      count: counts.get(bucket) ?? bucket.count,
    })),
  };
}
