import {
  BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT,
  type QueryContext,
} from '../../shared';
import {
  INVOCATION_STATUSES,
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationSortV2,
  type ResolvedInvocationModeV2,
} from '../shared';
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
} from './types';

export function sourcePlansToExecute(
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
        ? 'transitioned_at cannot be combined with the requested filters'
        : 'transitioned_at requires filters and statuses that expose transition timestamps',
    };
  }
  return {
    error:
      'No query source can satisfy all requested filters, statuses, and sort',
  };
}

async function queryCandidates(
  context: QueryContext,
  query: InvocationCandidateQueryPlan,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
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
        includeInvocationDetails,
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
        includeInvocationDetails,
      );
      return { candidates: result.rows };
    }

    case 'sys_vqueues': {
      const result = await queryCandidatesFromSysVqueues(
        context,
        query,
        mode,
        includeInvocationDetails,
      );
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
        includeInvocationDetails,
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

export async function selectVqueueInvocationCandidates(
  context: QueryContext,
  queryPlan: VqueueListQueryPlan,
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
  { includeInvocationDetails }: { includeInvocationDetails: boolean },
): Promise<
  | {
      rows: InvocationCandidate[];
      partial?: VqueueListPartialResult;
    }
  | { error: string }
> {
  if (queryPlan.error) return { error: queryPlan.error };
  const selected = sourcePlansToExecute(queryPlan, sort);
  if ('error' in selected) return selected;
  if (selected.sourcePlans.length === 0) return { rows: [] };

  const queryResults = await Promise.all(
    selected.sourcePlans.map((sourcePlan) =>
      queryCandidates(context, sourcePlan, mode, includeInvocationDetails),
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
  const partial = queryResults.find((result) => result.partial)?.partial;
  return {
    rows: [...candidatesById.values()],
    ...(partial && { partial }),
  };
}
