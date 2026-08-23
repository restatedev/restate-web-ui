import type { components } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../shared';
import { enrichInvocationFlowControl } from './list/enrichInvocationFlowControl';
import { loadInvocationsFromInvocationStatusAndState } from './list/listInvocationsFromInvocationStatusAndState';
import { loadVqueueInvocationsByIds } from './list/loadVqueueInvocationsByIds';
import { selectInvocationCandidatesV2 } from './selectInvocationCandidatesV2';
import { badRequest, INVOCATIONS_V2_LIMIT } from './shared';

export type ListInvocationsV2Args =
  components['schemas']['ListInvocationsV2RequestBody'];
type ListInvocationsV2Response =
  components['schemas']['ListInvocationsV2Response'];

/**
 * Validates a list request, captures one timestamp for consistent computed
 * durations, and routes to VQueue or invocation status/state candidates.
 */
export async function listInvocationsV2(
  this: QueryContext,
  {
    filters = [],
    sort,
    mode: requestedMode,
    includeFlowControl = false,
  }: ListInvocationsV2Args,
): Promise<Response> {
  const selected = await selectInvocationCandidatesV2(this, {
    filters,
    sort,
    mode: requestedMode,
    includeInvocationDetails: false,
  });
  if ('error' in selected) return badRequest(selected.error);

  const requestTime = new Date().toISOString();
  const loaded =
    selected.source === 'vqueue'
      ? await loadVqueueInvocationsByIds(
          this,
          selected.rows,
          filters,
          selected.statusSelection,
          sort,
          requestTime,
        )
      : {
          rows: await loadInvocationsFromInvocationStatusAndState(
            this,
            selected.rows,
            filters,
            sort,
            requestTime,
          ),
          statusChangedInvocationIds: [],
        };
  const rows = loaded.rows;
  const limitedRows = rows.slice(0, INVOCATIONS_V2_LIMIT);
  const limitedRowIds = new Set(limitedRows.map((row) => row.id));
  const statusChangedInvocationIds = loaded.statusChangedInvocationIds.filter(
    (id) => limitedRowIds.has(id),
  );
  const currentMatchingRowCount =
    limitedRows.length - statusChangedInvocationIds.length;
  const cappedCandidateHydrationWasIncomplete =
    selected.limit > 0 &&
    selected.rows.length >= selected.limit &&
    currentMatchingRowCount < selected.limit;
  const isPartial =
    selected.mode.type === 'sampled' ||
    Boolean(selected.partial) ||
    cappedCandidateHydrationWasIncomplete;
  const enrichedRows =
    includeFlowControl && selected.source === 'vqueue'
      ? await enrichInvocationFlowControl(this, limitedRows, requestTime)
      : limitedRows;

  return Response.json({
    rows: enrichedRows,
    limit: INVOCATIONS_V2_LIMIT,
    mode: selected.mode.type,
    isPartial,
    ...(statusChangedInvocationIds.length > 0 && {
      statusChangedInvocationIds,
    }),
    ...(selected.partial && { partial: selected.partial }),
    ...(selected.mode.type === 'sampled' && {
      sample: {
        sampleSize: selected.mode.sampleSize,
      },
    }),
  } satisfies ListInvocationsV2Response);
}
