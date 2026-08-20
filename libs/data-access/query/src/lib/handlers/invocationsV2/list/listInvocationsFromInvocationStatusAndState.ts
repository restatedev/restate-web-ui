import type {
  RawInvocation,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../../../convertInvocation';
import type { QueryContext } from '../../shared';
import {
  INVOCATIONS_V2_LIMIT,
  type InvocationFilterV2,
  type InvocationSortV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import {
  invocationStateOnlyStatuses,
  needsInvocationStateJoin,
} from './invocationStatusPlan';
import { queryInvocationRowsByIds } from './queryInvocationRowsByIds';
import { queryRunningOrBackingOffCandidatesFromInvocationState } from './queryRunningOrBackingOffCandidatesFromInvocationState';
import { queryCandidatesFromInvocationStatusAndState } from './queryCandidatesFromInvocationStatusAndState';
import { queryCandidatesFromInvocationStatus } from './queryCandidatesFromInvocationStatus';
import type { InvocationCandidateRow } from './types';

type Invocation = components['schemas']['Invocation'];

function withDuration(invocation: Invocation, requestTime: string): Invocation {
  if (invocation.status === 'scheduled') return invocation;
  const start = invocation.scheduled_start_at ?? invocation.created_at;
  const end = invocation.completed_at ?? requestTime;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return invocation;
  return {
    ...invocation,
    duration: `PT${Number((Math.max(0, endMs - startMs) / 1000).toFixed(3))}S`,
  };
}

export async function selectInvocationsFromInvocationStatusAndState(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
  limit = INVOCATIONS_V2_LIMIT,
) {
  const invocationStateStatuses = invocationStateOnlyStatuses(filters, sort);
  let candidatesResult;
  if (invocationStateStatuses) {
    candidatesResult =
      await queryRunningOrBackingOffCandidatesFromInvocationState(
        context,
        invocationStateStatuses,
        limit,
      );
  } else if (needsInvocationStateJoin(filters)) {
    candidatesResult = await queryCandidatesFromInvocationStatusAndState(
      context,
      filters,
      sort,
      mode,
      includeInvocationDetails,
      limit,
    );
  } else {
    candidatesResult = await queryCandidatesFromInvocationStatus(
      context,
      filters,
      sort,
      mode,
      includeInvocationDetails,
      limit,
    );
  }
  return candidatesResult.rows as InvocationCandidateRow[];
}

export async function loadInvocationsFromInvocationStatusAndState(
  context: QueryContext,
  candidates: InvocationCandidateRow[],
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  requestTime: string,
): Promise<Invocation[]> {
  const ids = candidates.map((row) => row.id as string).filter(Boolean);
  if (ids.length === 0) return [];
  const detailRows = (
    await queryInvocationRowsByIds(context, ids, filters, sort)
  ).rows as RawInvocation[];
  return detailRows.map((row) =>
    withDuration(convertInvocation(row), requestTime),
  );
}
