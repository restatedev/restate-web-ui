import {
  BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT,
  type QueryContext,
} from '../../shared';
import {
  INVOCATION_STATUSES,
  INVOCATIONS_V2_LIMIT,
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationFilterV2,
  type InvocationSortV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import { loadVqueueInvocationsByIds } from './loadVqueueInvocationsByIds';
import { queryBestEffortCandidatesFromSysInvocationStatus } from './queryBestEffortCandidatesFromSysInvocationStatus';
import { queryCandidatesFromSysInvocationStatus } from './queryCandidatesFromSysInvocationStatus';
import { queryCandidatesFromSysVqueueMetaAndSysVqueues } from './queryCandidatesFromSysVqueueMetaAndSysVqueues';
import { queryCandidatesFromSysVqueues } from './queryCandidatesFromSysVqueues';
import type {
  ExecutableInvocationCandidateSourcePlan,
  InvocationCandidate,
  InvocationCandidateQueryPlan,
  VqueueListPartialResult,
  VqueueListQueryPlan,
  VqueueListResult,
} from './types';

function sourcePlansToExecute(
  queryPlan: VqueueListQueryPlan,
  sort: InvocationSortV2 | undefined,
):
  | { sourcePlans: ExecutableInvocationCandidateSourcePlan[] }
  | { error: string } {
  const fullPlans = queryPlan.sourcePlans.filter(
    (sourcePlan): sourcePlan is ExecutableInvocationCandidateSourcePlan =>
      sourcePlan.coverage === 'full',
  );
  const fullPlan =
    fullPlans.find((sourcePlan) => sourcePlan.source === 'sys_vqueues') ??
    fullPlans.find(
      (sourcePlan) => sourcePlan.source === 'sys_invocation_status',
    ) ??
    fullPlans.find(
      (sourcePlan) => sourcePlan.source === 'sys_vqueue_meta_and_sys_vqueues',
    ) ??
    fullPlans.find(
      (sourcePlan) => sourcePlan.source === 'best_effort_sys_invocation_status',
    ) ??
    fullPlans[0];
  if (fullPlan) return { sourcePlans: [fullPlan] };

  const requestedStatuses = new Set(
    queryPlan.statusSelection.type === 'all'
      ? INVOCATION_STATUSES
      : queryPlan.statusSelection.statuses,
  );
  const sourcePlans: ExecutableInvocationCandidateSourcePlan[] = [];
  for (const sourcePlan of queryPlan.sourcePlans) {
    if (sourcePlan.coverage !== 'partial') continue;
    const coveredStatuses = sourcePlan.statuses;
    if (!coveredStatuses.some((status) => requestedStatuses.has(status))) {
      continue;
    }
    sourcePlans.push(sourcePlan);
    for (const status of coveredStatuses) requestedStatuses.delete(status);
    if (requestedStatuses.size === 0) break;
  }
  if (requestedStatuses.size === 0) return { sourcePlans };

  if (sort?.field === 'transitioned_at') {
    return {
      error: [...requestedStatuses].some((status) =>
        STATUSES_RESOLVED_FROM_VQUEUE.has(status),
      )
        ? 'transitioned_at cannot be combined with invocation-status-owned filters'
        : 'transitioned_at requires filters and statuses that can be read entirely from VQueues',
    };
  }
  return {
    error:
      'No query source can satisfy all requested filters, statuses, and sort',
  };
}

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

async function queryCandidates(
  context: QueryContext,
  query: InvocationCandidateQueryPlan,
  mode: ResolvedInvocationModeV2,
): Promise<{
  candidates: InvocationCandidate[];
  partial?: VqueueListPartialResult;
}> {
  switch (query.source) {
    case 'best_effort_sys_invocation_status': {
      const result = await queryBestEffortCandidatesFromSysInvocationStatus(
        context,
        query,
        mode,
      );
      return {
        candidates: result.rows.map((row) => ({
          ...row,
          refinesStatusFromVqueue: true,
        })),
        ...(result.rows.length === BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT && {
          partial: {
            reason: 'candidate-limit' as const,
            candidateLimit: BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT,
          },
        }),
      };
    }

    case 'sys_invocation_status': {
      const result = await queryCandidatesFromSysInvocationStatus(
        context,
        query,
        mode,
      );
      return { candidates: result.rows };
    }

    case 'sys_vqueues': {
      const result = await queryCandidatesFromSysVqueues(context, query, mode);
      return {
        candidates: result.rows.map((row) => ({
          ...row,
          requiresVqueueEntry: true,
        })),
      };
    }

    case 'sys_vqueue_meta_and_sys_vqueues': {
      const result = await queryCandidatesFromSysVqueueMetaAndSysVqueues(
        context,
        query,
        mode,
      );
      return {
        candidates: result.rows.map((row) => ({
          ...row,
          requiresVqueueEntry: true,
        })),
        partial: result.partial,
      };
    }
  }
}

/** Executes independent candidate-source plans in parallel. */
export async function executeVqueueListQueryPlan(
  context: QueryContext,
  queryPlan: VqueueListQueryPlan,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
  requestTime: string,
): Promise<VqueueListResult> {
  const invocationIds = invocationIdsFromFilters(filters);
  if (invocationIds) {
    if (invocationIds.length === 0) return { rows: [] };
    const rows = await loadVqueueInvocationsByIds(
      context,
      invocationIds.map((id) => ({ id })),
      filters,
      queryPlan.statusSelection,
      sort,
      requestTime,
    );
    return { rows };
  }

  if (queryPlan.error) return { error: queryPlan.error };
  const selected = sourcePlansToExecute(queryPlan, sort);
  if ('error' in selected) return selected;
  if (selected.sourcePlans.length === 0) return { rows: [] };

  const queryResults = await Promise.all(
    selected.sourcePlans.map((sourcePlan) =>
      queryCandidates(context, sourcePlan, mode),
    ),
  );
  const candidatesById = new Map<string, InvocationCandidate>();
  for (const { candidates } of queryResults) {
    for (const candidate of candidates) {
      if (!candidatesById.has(candidate.id)) {
        candidatesById.set(candidate.id, candidate);
      }
    }
  }
  const hydratedCandidates = await loadVqueueInvocationsByIds(
    context,
    [...candidatesById.values()],
    filters,
    queryPlan.statusSelection,
    sort,
    requestTime,
  );
  const partial = queryResults.find((result) => result.partial)?.partial;

  return {
    rows: hydratedCandidates.slice(0, INVOCATIONS_V2_LIMIT),
    ...(partial && { partial }),
  };
}
