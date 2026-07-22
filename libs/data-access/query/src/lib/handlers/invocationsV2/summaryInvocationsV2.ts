import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../shared';
import {
  badRequest,
  hasCompleteVqueueInvocationPopulation,
  resolveInvocationModeV2,
  validateInvocationFiltersV2,
} from './shared';
import { queryInvocationSummaryFromInvocationStatusAndState } from './summary/queryInvocationSummaryFromInvocationStatusAndState';
import { queryInvocationSummaryFromVqueues } from './summary/queryInvocationSummaryFromVqueues';
import type { InvocationSummaryQueryResult } from './summary/types';
import { createInvocationSummaryQueryPlan } from './summary/createInvocationSummaryQueryPlan';
import { rangeToCreatedAtFilter } from '../summaryInvocations';

export type SummaryInvocationsV2Args =
  components['schemas']['SummaryInvocationsV2RequestBody'];

function matchesStringFilter(value: string, filter: FilterItem) {
  if (filter.type === 'STRING') {
    switch (filter.operation) {
      case 'EQUALS':
        return value === filter.value;
      case 'NOT_EQUALS':
        return value !== filter.value;
      case 'CONTAINS':
        return value.includes(filter.value ?? '');
      case 'NOT_CONTAINS':
        return !value.includes(filter.value ?? '');
      case 'IS NULL':
        return false;
      case 'IS NOT NULL':
        return true;
    }
  }
  if (filter.type === 'STRING_LIST') {
    const contains = filter.value.includes(value);
    return filter.operation === 'IN' ? contains : !contains;
  }
  if (filter.type === 'NULL') {
    return filter.operation === 'IS_NOT';
  }
  return true;
}

/**
 * Applies filters not listed in highlightFields to the aggregate query. Each
 * highlighted field remains outside SQL so sibling buckets stay visible and
 * the response can mark which buckets the current selection includes.
 */
export async function summaryInvocationsV2(
  this: QueryContext,
  {
    filters = [],
    highlightFields = [],
    mode: requestedMode,
    range,
    view = 'all',
  }: SummaryInvocationsV2Args,
): Promise<Response> {
  const queryStartedAt = performance.now();
  const rangeFilter = this.features.has('vqueues')
    ? undefined
    : rangeToCreatedAtFilter(range);
  const requestedFilters = rangeFilter ? [rangeFilter, ...filters] : filters;
  const filterError = validateInvocationFiltersV2(requestedFilters);
  if (filterError) return badRequest(filterError);

  const { mode, error: modeError } = resolveInvocationModeV2(requestedMode);
  if (modeError || !mode) return badRequest(modeError ?? 'Invalid query mode');

  const highlightedFields = new Set<string>(highlightFields);
  const appliedFilters = requestedFilters.filter(
    (filter) => !highlightedFields.has(filter.field),
  );
  const statusHighlightFilters = requestedFilters.filter(
    (filter) =>
      filter.field === 'status' && highlightedFields.has(filter.field),
  ) as FilterItem[];
  const serviceHighlightFilters = requestedFilters.filter(
    (filter) =>
      filter.field === 'target_service_name' &&
      highlightedFields.has(filter.field),
  ) as FilterItem[];

  const hasCompleteVqueues = hasCompleteVqueueInvocationPopulation(this);
  const { selectedPlan } = createInvocationSummaryQueryPlan(
    this,
    appliedFilters,
    mode,
    view,
  );
  if (!selectedPlan || selectedPlan.coverage === 'none') {
    return badRequest('No invocation summary query is available');
  }
  const usesExactLegacyStageSummary =
    selectedPlan.source ===
    'sys_invocation_status_and_sys_invocation_state_exact_summary';

  let result: InvocationSummaryQueryResult;
  if (selectedPlan.source === 'sys_vqueue_meta_and_sys_vqueues') {
    result = await queryInvocationSummaryFromVqueues(
      this,
      mode,
      !hasCompleteVqueues,
      selectedPlan.filters,
      view,
    );
  } else if (usesExactLegacyStageSummary) {
    result = await queryInvocationSummaryFromInvocationStatusAndState(
      this,
      selectedPlan.filters,
      { type: 'exact' },
    );
  } else {
    result = await queryInvocationSummaryFromInvocationStatusAndState(
      this,
      selectedPlan.filters,
      mode,
    );
  }

  const statusMatches = (status: string) =>
    statusHighlightFilters.every((filter) =>
      matchesStringFilter(status, filter),
    );
  const serviceMatches = (service: string) =>
    serviceHighlightFilters.every((filter) =>
      matchesStringFilter(service, filter),
    );
  const statusBuckets = result.statusBuckets.map((bucket) => ({
    ...bucket,
    isIncluded: bucket.statuses.some(statusMatches),
  }));
  const stageBuckets = result.stageBuckets.map((bucket) => ({
    ...bucket,
    isIncluded: bucket.statuses.some(statusMatches),
  }));

  return Response.json({
    queryDurationMs: performance.now() - queryStartedAt,
    mode: usesExactLegacyStageSummary ? 'exact' : mode.type,
    isPartial: result.isPartial,
    stageCountsArePartial: result.stageCountsArePartial,
    total: stageBuckets.reduce((total, bucket) => total + bucket.count, 0),
    ...(mode.type === 'sampled' &&
      !usesExactLegacyStageSummary && {
        sample: { sampleSize: mode.sampleSize },
      }),
    appliedFilters,
    stageBuckets,
    statusBuckets,
    serviceBuckets: result.serviceBuckets.map((bucket) => ({
      ...bucket,
      statusBuckets: bucket.statusBuckets.map((statusBucket) => ({
        ...statusBucket,
        isIncluded: statusBucket.statuses.some(statusMatches),
      })),
      isIncluded: serviceMatches(bucket.service),
    })),
  });
}
