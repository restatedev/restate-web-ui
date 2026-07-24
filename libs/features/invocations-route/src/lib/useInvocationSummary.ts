import { useProgressiveInvocationSummaryV2 } from '@restate/data-access/admin-api-hooks';
import {
  INVOCATION_STATUS_DEFINITIONS,
  type components,
} from '@restate/data-access/admin-api-spec';
import type { VQueueSummaryFocus } from '@restate/features/status-chart';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getInvocationSummaryMatchCount } from './invocationSummaryMatchCount';
import { hasStatusFilter, type StatusFilter } from './statusFilter';
import { useStatusBarProps } from './useStatusBarProps';

type InvocationFilter = components['schemas']['InvocationV2FilterItem'];
type InvocationStatus = components['schemas']['InvocationStatus'];

function getStatusFilter(filters: InvocationFilter[] | undefined) {
  const filter = filters?.find(({ field }) => field === 'status');
  return filter?.type === 'STRING_LIST' ? filter : undefined;
}

function getFocusFromStatusFilter(
  statusFilter: StatusFilter,
): VQueueSummaryFocus {
  if (!hasStatusFilter(statusFilter)) return 'all';

  const values = new Set(statusFilter.value);
  let includesCompleted = false;
  let includesNotCompleted = false;
  for (const { key, stage } of INVOCATION_STATUS_DEFINITIONS) {
    const matches =
      statusFilter.operation === 'IN' ? values.has(key) : !values.has(key);
    if (!matches) continue;
    if (stage === 'finished') includesCompleted = true;
    else includesNotCompleted = true;
  }

  if (includesCompleted === includesNotCompleted) return 'all';
  return includesCompleted ? 'completed' : 'not-completed';
}

export function useInvocationSummary({
  filters,
  countMode,
  breakdownSampleSize,
}: {
  filters: InvocationFilter[] | undefined;
  countMode: 'estimate' | 'exact';
  breakdownSampleSize: number;
}) {
  const queryClient = useQueryClient();
  const statusFilter = getStatusFilter(filters);
  const appliedFilters = filters?.filter(({ field }) => field !== 'status');
  const summary = useProgressiveInvocationSummaryV2(
    {
      filters: appliedFilters,
      highlightFields: ['target_service_name'],
      mode:
        countMode === 'estimate'
          ? { type: 'sampled', sampleSize: breakdownSampleSize }
          : { type: 'exact' },
    },
    { refetchOnWindowFocus: false },
  );
  const stageBuckets = summary.data?.stageBuckets ?? [];
  const statusBuckets = summary.data?.statusBuckets ?? [];
  const selectedStatuses = new Set(statusFilter?.value ?? []);
  const statusIsIncluded = (statuses: InvocationStatus[]) =>
    !statusFilter ||
    statuses.some((status) =>
      statusFilter.operation === 'IN'
        ? selectedStatuses.has(status)
        : !selectedStatuses.has(status),
    );
  const notCompletedStatuses = stageBuckets
    .filter(({ key }) => key !== 'finished')
    .flatMap(({ statuses }) => statuses);
  const filterBuckets = [
    ...statusBuckets.map((bucket) => ({
      ...bucket,
      isIncluded: statusIsIncluded(bucket.statuses),
    })),
    ...stageBuckets.map((bucket) => ({
      ...bucket,
      isIncluded: statusIsIncluded(bucket.statuses),
    })),
    {
      key: 'not-completed',
      label: 'All not completed',
      statuses: notCompletedStatuses,
      count: stageBuckets
        .filter(({ key }) => key !== 'finished')
        .reduce((count, bucket) => count + bucket.count, 0),
      isIncluded: statusIsIncluded(notCompletedStatuses),
    },
  ];
  const statusBarProps = useStatusBarProps(statusFilter, filterBuckets);
  const matchingCount = getInvocationSummaryMatchCount(summary.data, filters);
  const refresh = useCallback(() => {
    // A matching summary request normally starts earlier in the same render as
    // the list request. Reuse it instead of cancelling and issuing a duplicate.
    void Promise.all(
      summary.queryKeys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false }),
      ),
    );
  }, [queryClient, summary.queryKeys]);

  return {
    ...summary,
    refresh,
    matchingCount,
    focus: getFocusFromStatusFilter(statusFilter),
    statusFilter,
    stageCountsReflectFilters: (appliedFilters ?? []).some(
      ({ field }) => field !== 'target_service_name',
    ),
    breakdownIsSampled: countMode === 'estimate',
    canSampleBreakdown: true,
    byStage: stageBuckets.map((bucket) => ({
      name: bucket.key,
      label: bucket.label,
      count: bucket.count,
      statuses: bucket.statuses,
      breakdownIsPartial: bucket.breakdownIsPartial,
    })),
    byStatus: statusBuckets.map((bucket) => ({
      name: bucket.key,
      label: bucket.label,
      count: bucket.count,
      statuses: bucket.statuses,
    })),
    isLoading: summary.isPending || summary.isPlaceholderData,
    ...statusBarProps,
  };
}
