import {
  INVOCATION_STATUS_DEFINITIONS,
  type components,
} from '@restate/data-access/admin-api-spec';
import { STATUS_ORDER } from '@restate/features/status-chart';

type InvocationFilter = components['schemas']['InvocationV2FilterItem'];
type InvocationSummary = components['schemas']['SummaryInvocationsV2Response'];
type StageBucket = components['schemas']['InvocationStageSummaryBucketV2'];
type InboxStatusBreakdown =
  components['schemas']['InboxInvocationsStatusBreakdownV2Response'];

const statusOrder = new Map(
  STATUS_ORDER.map((status, index) => [status, index]),
);

function orderStatusBuckets<T extends { key: string }>(buckets: T[]) {
  return buckets.sort(
    (left, right) =>
      (statusOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (statusOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER),
  );
}

function contextualStatusBuckets(
  summary: InvocationSummary | undefined,
  inboxBreakdown: InboxStatusBreakdown | undefined,
) {
  if (!summary) return [];
  if (!inboxBreakdown) return summary.statusBuckets;

  const inboxStatuses = new Set(
    summary.stageBuckets.find(({ key }) => key === 'inbox')?.statuses ?? [],
  );
  const definitions = new Map(
    INVOCATION_STATUS_DEFINITIONS.map((definition) => [
      definition.key,
      definition,
    ]),
  );
  return orderStatusBuckets([
    ...inboxBreakdown.byStatus.map(({ status, count }) => ({
      key: status,
      label: definitions.get(status)?.label ?? status,
      statuses: [status],
      count,
      isIncluded: true,
    })),
    ...summary.statusBuckets.filter((bucket) =>
      bucket.statuses.every((status) => !inboxStatuses.has(status)),
    ),
  ]);
}

function aggregateStageBuckets(
  stages: StageBucket[],
  services: InvocationSummary['serviceBuckets'],
  contextualStages: StageBucket[] | undefined,
): StageBucket[] {
  const contextual = new Map(
    contextualStages?.map((stage) => [stage.key, stage]),
  );
  return stages.map((stage) => {
    const stageStatuses = new Set(stage.statuses);
    const count = services.reduce(
      (serviceTotal, service) =>
        serviceTotal +
        service.statusBuckets.reduce(
          (bucketTotal, bucket) =>
            bucket.statuses.every((status) => stageStatuses.has(status))
              ? bucketTotal + bucket.count
              : bucketTotal,
          0,
        ),
      0,
    );
    const contextualStage = contextual.get(stage.key);
    return {
      ...stage,
      count,
      ...(contextualStage && {
        breakdownIsPartial: contextualStage.breakdownIsPartial,
        breakdownCoverage: contextualStage.breakdownCoverage,
        breakdownCanRefine: contextualStage.breakdownCanRefine,
      }),
    };
  });
}

export function getInvocationSummaryFacets(
  summary: InvocationSummary | undefined,
  filters: InvocationFilter[] | undefined,
  contextualSummary?: InvocationSummary,
  contextualInboxBreakdown?: InboxStatusBreakdown,
) {
  const populationByStage = summary?.stageBuckets ?? [];
  const populationByStatus = summary?.statusBuckets ?? [];
  const hasServiceFilter = Boolean(
    filters?.some(({ field }) => field === 'target_service_name'),
  );

  if (!summary || !hasServiceFilter) {
    return {
      byStage: populationByStage,
      byStatus: populationByStatus,
      populationByStage,
      populationByStatus,
      hasServiceFilter: false,
    };
  }

  const services = summary.serviceBuckets.filter(
    ({ isIncluded }) => isIncluded,
  );
  const contextualStages = contextualSummary?.stageBuckets.map((stage) =>
    stage.key === 'inbox' && contextualInboxBreakdown
      ? {
          ...stage,
          breakdownIsPartial: contextualInboxBreakdown.isPartial,
          breakdownCoverage: 'full' as const,
          breakdownCanRefine: false,
        }
      : stage,
  );
  return {
    byStage: aggregateStageBuckets(
      populationByStage,
      services,
      contextualStages,
    ),
    byStatus: contextualStatusBuckets(
      contextualSummary,
      contextualInboxBreakdown,
    ),
    populationByStage,
    populationByStatus,
    hasServiceFilter: true,
  };
}
