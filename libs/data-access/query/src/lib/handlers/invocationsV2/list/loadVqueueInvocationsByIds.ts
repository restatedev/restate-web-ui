import type { RawInvocation } from '@restate/data-access/admin-api-spec';
import { convertInvocationV2 } from '../../../convertInvocation';
import type { QueryContext } from '../../shared';
import { getInvocationListFieldOnTable } from '../invocationListFields';
import {
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationFilterV2,
  type InvocationSortV2,
} from '../shared';
import { queryInvocationRowsByIds } from './queryInvocationRowsByIds';
import { queryVqueueEntryStatusRowsByIds } from './queryVqueueEntryStatusRowsByIds';
import type {
  InvocationCandidate,
  InvocationStatusSelection,
  VqueueRow,
} from './types';

/** Loads details and VQueue overlays in parallel, then rechecks every filter. */
export async function loadVqueueInvocationsByIds(
  context: QueryContext,
  candidates: InvocationCandidate[],
  filters: InvocationFilterV2[],
  statusSelection: InvocationStatusSelection,
  sort: InvocationSortV2 | undefined,
  requestTime: string,
) {
  if (candidates.length === 0) {
    return { rows: [], statusChangedInvocationIds: [] };
  }
  const ids = candidates.map((candidate) => candidate.id);
  const nonStatusFilters = filters.filter(
    (filter) => filter.field !== 'status',
  );
  const invocationSort =
    sort && getInvocationListFieldOnTable(sort.field, 'sys_invocation')
      ? sort
      : undefined;
  const vqueueSort = sort && !invocationSort ? sort : undefined;
  const [{ rows: invocationRows }, { rows: vqueueRows }] = await Promise.all([
    queryInvocationRowsByIds(context, ids, nonStatusFilters, invocationSort),
    queryVqueueEntryStatusRowsByIds(context, ids, filters, vqueueSort),
  ]);
  const rawInvocations = invocationRows as RawInvocation[];
  const vqueueEntries = vqueueRows as VqueueRow[];
  const invocationsById = new Map(
    rawInvocations.map((row) => [row.id as string, row]),
  );
  const vqueuesById = new Map(vqueueEntries.map((row) => [row.entry_id, row]));
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  const orderedHydrationIds = invocationSort
    ? rawInvocations.map((row) => row.id as string)
    : vqueueSort
      ? vqueueEntries.map((row) => row.entry_id)
      : ids;
  const orderedIds = Array.from(new Set([...orderedHydrationIds, ...ids]));

  const rows: ReturnType<typeof convertInvocationV2>[] = [];
  const statusChangedInvocationIds: string[] = [];
  for (const id of orderedIds) {
    const candidate = candidatesById.get(id);
    if (!candidate) continue;
    const vqueue = vqueuesById.get(id);
    const raw = invocationsById.get(id);
    if (!raw || (candidate.requiresVqueueEntry && !vqueue)) continue;
    const invocation = convertInvocationV2(raw, vqueue, requestTime);
    if (
      statusSelection.type === 'selected' &&
      !statusSelection.statuses.has(invocation.status)
    ) {
      if (!candidate.matchedStatusAtSelection) continue;
      statusChangedInvocationIds.push(id);
    }
    const requiresVqueue =
      candidate.requiresVqueueEntry ||
      (candidate.refinesStatusFromVqueue &&
        STATUSES_RESOLVED_FROM_VQUEUE.has(invocation.status));
    if (requiresVqueue && !vqueue) continue;
    rows.push(invocation);
  }
  return { rows, statusChangedInvocationIds };
}
