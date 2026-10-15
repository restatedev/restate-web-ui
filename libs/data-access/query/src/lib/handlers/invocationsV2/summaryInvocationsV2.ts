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
import { queryInvocationCountV2 } from './summary/queryInvocationCountV2';
import {
  queryInvocationCountFromStats,
  queryInvocationDeploymentBucketsFromStats,
  queryInvocationSummaryFromStats,
} from './summary/statsSources';
import { countInvocationsFromIndexes } from './list/indexedInvocationCandidates';
import { matchesStringFilter } from './summary/matchesStringFilter';

export type SummaryInvocationsV2Args =
  components['schemas']['SummaryInvocationsV2RequestBody'];

const RANGE_DURATIONS_MS: Record<string, number> = {
  PT1H: 60 * 60 * 1000,
  P1D: 24 * 60 * 60 * 1000,
};

function rangeToCreatedAtFilter(range: string | undefined):
  | {
      type: 'DATE';
      field: 'created_at';
      operation: 'AFTER';
      value: string;
    }
  | undefined {
  if (!range) return undefined;
  const ms = RANGE_DURATIONS_MS[range];
  if (!ms) return undefined;
  return {
    type: 'DATE',
    field: 'created_at',
    operation: 'AFTER',
    value: new Date(Date.now() - ms).toISOString(),
  };
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

  if (view === 'deployments') {
    const deploymentBuckets = await queryInvocationDeploymentBucketsFromStats(
      this,
      requestedFilters,
    );
    if (!deploymentBuckets) {
      return badRequest('The deployments view requires deployment stats');
    }
    return Response.json({
      queryDurationMs: performance.now() - queryStartedAt,
      mode: 'exact',
      isPartial: false,
      stageCountsArePartial: false,
      total: deploymentBuckets.reduce((total, { count }) => total + count, 0),
      appliedFilters: requestedFilters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
      deploymentBuckets,
    });
  }
  const indexedCount =
    view !== 'count'
      ? undefined
      : ((await queryInvocationCountFromStats(this, requestedFilters)) ??
        (await countInvocationsFromIndexes(this, requestedFilters)));
  if (indexedCount !== undefined) {
    return Response.json({
      queryDurationMs: performance.now() - queryStartedAt,
      mode: 'exact',
      isPartial: false,
      stageCountsArePartial: false,
      total: indexedCount,
      appliedFilters: requestedFilters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
    });
  }
  if (view === 'count') {
    const countResult = await queryInvocationCountV2(
      this,
      requestedFilters,
      mode,
    );
    if ('error' in countResult) return badRequest(countResult.error);
    return Response.json({
      queryDurationMs: performance.now() - queryStartedAt,
      mode: mode.type,
      isPartial: countResult.isPartial,
      stageCountsArePartial: false,
      total: countResult.count,
      ...(mode.type === 'sampled' && {
        sample: { sampleSize: mode.sampleSize },
      }),
      appliedFilters: requestedFilters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
    });
  }

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
  const reportsExactMode =
    usesExactLegacyStageSummary || selectedPlan.source === 'stats';

  let result: InvocationSummaryQueryResult;
  const statsResult =
    selectedPlan.source === 'stats'
      ? await queryInvocationSummaryFromStats(this, selectedPlan.filters, view)
      : undefined;
  if (statsResult) {
    result = statsResult;
  } else if (selectedPlan.source === 'sys_vqueue_meta_and_sys_vqueues') {
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
    mode: reportsExactMode ? 'exact' : mode.type,
    isPartial: result.isPartial,
    stageCountsArePartial: result.stageCountsArePartial,
    total: stageBuckets.reduce((total, bucket) => total + bucket.count, 0),
    ...(mode.type === 'sampled' &&
      !reportsExactMode && {
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
      ...(bucket.statusBreakdown && {
        statusBreakdown: bucket.statusBreakdown.map((statusBucket) => ({
          ...statusBucket,
          isIncluded: statusBucket.statuses.some(statusMatches),
        })),
      }),
      isIncluded: serviceMatches(bucket.service),
    })),
  });
}
