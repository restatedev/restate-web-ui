import type {
  FilterItem,
  components,
} from '@restate/data-access-admin-api-spec';
import type { QueryContext } from '../shared.js';
import {
  badRequest,
  resolveInvocationModeV2,
  validateInvocationFiltersV2,
} from './shared.js';
import { queryInvocationSummaryFromInvocationStatusAndState } from './summary/queryInvocationSummaryFromInvocationStatusAndState.js';
import { queryInvocationSummaryFromVqueues } from './summary/queryInvocationSummaryFromVqueues.js';
import type { InvocationSummaryQueryResult } from './summary/types.js';
import { createInvocationSummaryQueryPlan } from './summary/createInvocationSummaryQueryPlan.js';
import { queryInvocationCountV2 } from './summary/queryInvocationCountV2.js';
import {
  queryInvocationCountFromStats,
  queryInvocationDeploymentBucketsFromStats,
  queryInvocationSummaryFromStats,
} from './summary/statsSources.js';
import { countInvocationsFromIndexes } from './list/indexedInvocationCandidates.js';
import { matchesStringFilter } from './summary/matchesStringFilter.js';

export type SummaryInvocationsV2Args =
  components['schemas']['SummaryInvocationsV2RequestBody'];

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
    view = 'all',
  }: SummaryInvocationsV2Args,
): Promise<Response> {
  const queryStartedAt = performance.now();
  const filterError = validateInvocationFiltersV2(filters);
  if (filterError) return badRequest(filterError);

  const { mode, error: modeError } = resolveInvocationModeV2(requestedMode);
  if (modeError || !mode) return badRequest(modeError ?? 'Invalid query mode');

  if (view === 'deployments') {
    const deploymentBuckets = await queryInvocationDeploymentBucketsFromStats(
      this,
      filters,
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
      appliedFilters: filters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
      deploymentBuckets,
    });
  }
  const indexedCount =
    view !== 'count'
      ? undefined
      : ((await queryInvocationCountFromStats(this, filters)) ??
        (await countInvocationsFromIndexes(this, filters)));
  if (indexedCount !== undefined) {
    return Response.json({
      queryDurationMs: performance.now() - queryStartedAt,
      mode: 'exact',
      isPartial: false,
      stageCountsArePartial: false,
      total: indexedCount,
      appliedFilters: filters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
    });
  }
  if (view === 'count') {
    const countResult = await queryInvocationCountV2(this, filters, mode);
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
      appliedFilters: filters,
      stageBuckets: [],
      statusBuckets: [],
      serviceBuckets: [],
    });
  }

  const highlightedFields = new Set<string>(highlightFields);
  const appliedFilters = filters.filter(
    (filter) => !highlightedFields.has(filter.field),
  );
  const statusHighlightFilters = filters.filter(
    (filter) =>
      filter.field === 'status' && highlightedFields.has(filter.field),
  ) as FilterItem[];
  const serviceHighlightFilters = filters.filter(
    (filter) =>
      filter.field === 'target_service_name' &&
      highlightedFields.has(filter.field),
  ) as FilterItem[];

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
