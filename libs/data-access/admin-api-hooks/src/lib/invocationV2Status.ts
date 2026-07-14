import type { components } from '@restate/data-access/admin-api-spec';

type SummaryData = components['schemas']['SummaryInvocationsV2Response'];
type InboxData = components['schemas']['InboxInvocationsBreakdownV2Response'];
type InvocationStage = components['schemas']['InvocationSummaryStageV2'];

export function getInvocationSummaryStageCount(
  summary: SummaryData | undefined,
  stage: InvocationStage,
) {
  return summary?.stageBuckets.find((item) => item.key === stage)?.count ?? 0;
}

export function getInvocationStatusBreakdownV2(
  summary: SummaryData | undefined,
) {
  if (!summary) return [];

  return summary.stageBuckets.flatMap((stage) => {
    if (stage.breakdownCoverage === 'missing') {
      return stage.count > 0 ? [{ name: stage.key, count: stage.count }] : [];
    }
    const statuses = new Set(stage.statuses);
    return summary.statusBuckets
      .filter(
        (bucket) =>
          (bucket.count > 0 ||
            (bucket.key === 'failed' &&
              bucket.statuses.includes('cancelled') &&
              bucket.statuses.includes('killed'))) &&
          bucket.statuses.some((status) => statuses.has(status)),
      )
      .map(({ key: name, label, statuses, count }) => ({
        name,
        count,
        ...(statuses.length > 1 && { label, statuses }),
      }));
  });
}

export function getServiceInvocationStageBreakdownV2(
  summary: SummaryData | undefined,
  service: string,
) {
  const serviceBuckets = summary?.serviceBuckets.find(
    (bucket) => bucket.service === service,
  )?.statusBuckets;
  if (!serviceBuckets) return [];

  return (summary?.stageBuckets ?? []).flatMap((stage) => {
    const statuses = new Set(stage.statuses);
    const count = serviceBuckets
      .filter(
        (bucket) =>
          bucket.key === stage.key ||
          bucket.statuses.some((status) => statuses.has(status)),
      )
      .reduce((total, bucket) => total + bucket.count, 0);
    return count > 0 ? [{ name: stage.key, count }] : [];
  });
}

export function getServiceInvocationStatusBreakdownV2(
  summary: SummaryData | undefined,
  service: string,
  inbox: InboxData,
) {
  const counts = new Map<string, number>();
  if (inbox.groupBy === 'status') {
    for (const item of inbox.byStatus) counts.set(item.status, item.count);
  }
  for (const { name, count } of getServiceInvocationStageBreakdownV2(
    summary,
    service,
  )) {
    if (name !== 'inbox' && name !== 'finished') counts.set(name, count);
  }
  return counts;
}
