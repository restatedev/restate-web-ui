import type { QueryContext } from '../shared';
import {
  getInvocationStatusFromVqueue,
  type InvocationStatus,
} from '../../invocationStatuses';
import { createVqueueListQueryPlan } from './list/createVqueueListQueryPlan';
import { selectVqueueInvocationCandidates } from './list/selectVqueueInvocationCandidates';
import { selectInvocationsFromInvocationStatusAndState } from './list/listInvocationsFromInvocationStatusAndState';
import { createQueryPlanWhenCompletedVqueuesWereSkipped } from './list/createQueryPlanWhenCompletedVqueuesWereSkipped';
import { queryVqueueCandidateStatusesByIds } from './list/queryVqueueCandidateStatusesByIds';
import type {
  InvocationCandidate,
  InvocationCandidateRow,
  InvocationStatusSelection,
  VqueueListPartialResult,
} from './list/types';
import {
  INVOCATIONS_V2_LIMIT,
  resolveInvocationModeV2,
  supportsInvocationV2Vqueues,
  type InvocationFilterV2,
  type InvocationModeV2,
  type InvocationSortV2,
  type ResolvedInvocationModeV2,
  validateInvocationFieldsForServer,
  validateInvocationFiltersV2,
  validateInvocationSortV2,
} from './shared';

type SelectInvocationCandidatesV2Args = {
  filters?: InvocationFilterV2[];
  sort?: InvocationSortV2;
  mode?: InvocationModeV2;
  includeInvocationDetails: boolean;
};

export type SelectInvocationCandidatesV2Result =
  | {
      source: 'invocation-status';
      rows: InvocationCandidateRow[];
      limit: number;
      mode: ResolvedInvocationModeV2;
      partial?: undefined;
    }
  | {
      source: 'vqueue';
      rows: InvocationCandidate[];
      limit: number;
      mode: ResolvedInvocationModeV2;
      statusSelection: InvocationStatusSelection;
      partial?: VqueueListPartialResult;
    }
  | { error: string };

function invocationIdsFromFilters(filters: InvocationFilterV2[]) {
  const idFilters = filters.filter((filter) => filter.field === 'id');
  if (idFilters.length === 0) return undefined;

  const values = idFilters.map((filter) =>
    filter.type === 'STRING_LIST'
      ? filter.value
      : filter.type === 'STRING' && typeof filter.value === 'string'
        ? [filter.value]
        : [],
  );
  const additionalFilters = values.slice(1).map((ids) => new Set(ids));
  return [...new Set(values[0] ?? [])].filter((id) =>
    additionalFilters.every((ids) => ids.has(id)),
  );
}

function storedCandidateStatus(
  candidate: InvocationCandidate,
): InvocationStatus | undefined {
  switch (candidate.raw_status) {
    case 'inboxed':
      return 'pending';
    case 'completed': {
      if (candidate.completion_result === 'success') return 'succeeded';
      const failure = candidate.completion_failure?.toLowerCase();
      if (failure === '[409] killed') return 'killed';
      if (failure === '[409] canceled' || failure === '[409] cancelled') {
        return 'cancelled';
      }
      return candidate.completion_result === 'failure' ? 'failed' : undefined;
    }
    case 'scheduled':
    case 'suspended':
    case 'paused':
      return candidate.raw_status;
    default:
      return undefined;
  }
}

async function refineBestEffortCandidates(
  context: QueryContext,
  candidates: InvocationCandidate[],
  statusSelection: InvocationStatusSelection,
) {
  if (statusSelection.type === 'all') return candidates;
  const candidatesToRefine = candidates.filter(
    ({ refinesStatusFromVqueue }) => refinesStatusFromVqueue,
  );
  if (candidatesToRefine.length === 0) return candidates;
  const { rows } = await queryVqueueCandidateStatusesByIds(
    context,
    candidatesToRefine.map(({ id }) => id),
  );
  const statusesById = new Map(
    rows.map((row) => [row.entry_id, getInvocationStatusFromVqueue(row)]),
  );
  return candidates.filter((candidate) => {
    if (!candidate.refinesStatusFromVqueue) return true;
    const status =
      statusesById.get(candidate.id) ?? storedCandidateStatus(candidate);
    return status !== undefined && statusSelection.statuses.has(status);
  });
}

function compareCreatedAt(
  left: InvocationCandidate,
  right: InvocationCandidate,
  order: InvocationSortV2['order'],
) {
  const leftCreatedAt = left.created_at ?? '';
  const rightCreatedAt = right.created_at ?? '';
  const compared = leftCreatedAt.localeCompare(rightCreatedAt);
  const ordered = order === 'ASC' ? compared : -compared;
  return ordered || left.id.localeCompare(right.id);
}

export async function selectInvocationCandidatesV2(
  context: QueryContext,
  {
    filters = [],
    sort,
    mode: requestedMode,
    includeInvocationDetails,
  }: SelectInvocationCandidatesV2Args,
): Promise<SelectInvocationCandidatesV2Result> {
  const filterError = validateInvocationFiltersV2(filters);
  if (filterError) return { error: filterError };
  const sortError = validateInvocationSortV2(sort);
  if (sortError) return { error: sortError };

  const { mode, error: modeError } = resolveInvocationModeV2(requestedMode);
  if (modeError || !mode) return { error: modeError ?? 'Invalid mode' };

  const useVqueues = supportsInvocationV2Vqueues(context);
  const fieldAvailabilityError = validateInvocationFieldsForServer(
    context,
    filters,
    sort,
    useVqueues
      ? ['sys_vqueues', 'sys_vqueue_meta', 'sys_invocation_status']
      : ['sys_invocation_status'],
  );
  if (fieldAvailabilityError) return { error: fieldAvailabilityError };

  if (!useVqueues) {
    const rows = await selectInvocationsFromInvocationStatusAndState(
      context,
      filters,
      sort,
      mode,
      includeInvocationDetails,
    );
    return {
      source: 'invocation-status',
      rows,
      limit: INVOCATIONS_V2_LIMIT,
      mode,
    };
  }

  const queryPlan = context.features.has('vqueues_migration_skip_completed')
    ? createQueryPlanWhenCompletedVqueuesWereSkipped(context, filters, sort)
    : createVqueueListQueryPlan(context, filters, sort);
  const invocationIds = invocationIdsFromFilters(filters);
  if (invocationIds) {
    return {
      source: 'vqueue',
      rows: invocationIds.map((id) => ({ id })),
      limit: INVOCATIONS_V2_LIMIT,
      mode,
      statusSelection: queryPlan.statusSelection,
    };
  }
  const result = await selectVqueueInvocationCandidates(
    context,
    queryPlan,
    sort,
    mode,
    { includeInvocationDetails },
  );
  if ('error' in result) return result;
  const candidates = includeInvocationDetails
    ? await refineBestEffortCandidates(
        context,
        result.rows,
        queryPlan.statusSelection,
      )
    : result.rows;
  if (includeInvocationDetails && sort?.field === 'created_at') {
    candidates.sort((left, right) => compareCreatedAt(left, right, sort.order));
  }
  return {
    source: 'vqueue',
    rows: candidates,
    limit: INVOCATIONS_V2_LIMIT,
    mode,
    statusSelection: queryPlan.statusSelection,
    ...(result.partial && { partial: result.partial }),
  };
}
