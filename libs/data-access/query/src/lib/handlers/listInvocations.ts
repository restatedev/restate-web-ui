import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import {
  convertInvocationsFilters,
  convertInvocationsFiltersForBaseJoin,
  shouldUseBaseJoinForStatus,
} from '../convertFilters';
import {
  type QueryContext,
  getSysInvocationListColumns,
  DURATION_EXPRESSION,
} from './shared';
import { fetchVqueueStatuses, vqueueStatusEnabled } from './vqueue';

const INVOCATIONS_LIMIT = 250;
const DEFAULT_SAMPLE_SIZE = 50000;

// The "Processing" preset: status IN running/backing-off/ready and nothing
// else. Without vqueues these are exactly the rows of sys_invocation_state, so
// the id scan can hit that small table directly (see below).
const PROCESSING_STATUSES = ['running', 'backing-off', 'ready'];
function isProcessingPresetFilters(filters: FilterItem[]): boolean {
  if (filters.length !== 1) return false;
  const f = filters[0];
  if (
    !f ||
    f.field !== 'status' ||
    f.type !== 'STRING_LIST' ||
    f.operation !== 'IN'
  ) {
    return false;
  }
  return (
    f.value.length === PROCESSING_STATUSES.length &&
    PROCESSING_STATUSES.every((status) => f.value.includes(status))
  );
}

export async function listInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sort?: components['schemas']['ListInvocationsRequestBody']['sort'],
  sampled = false,
  sampleSize = DEFAULT_SAMPLE_SIZE,
) {
  const isSortByDuration = sort?.field === 'duration';
  const idSelectColumns = isSortByDuration
    ? `id, ${DURATION_EXPRESSION}`
    : 'id';
  // Base-join id columns: `id` must be qualified (it exists on both sides of the
  // join); the duration expression references sys_invocation_status columns
  // only, so it resolves unambiguously, as do all sortable columns.
  const baseIdSelectColumns = isSortByDuration
    ? `ss.id AS id, ${DURATION_EXPRESSION}`
    : 'ss.id AS id';
  // No sort → omit ORDER BY entirely; rows come back in scan order (fastest).
  const orderBy = sort ? `ORDER BY ${sort.field} ${sort.order}` : '';
  // vqueue-backed backing-off invocations show as 'ready' on the view, so the
  // status filter rewrites backing-off/ready to match the overlaid status.
  const vqueueBackingOff = vqueueStatusEnabled(this);

  // Sampled mode caps the scan to the first `sampleSize` rows before the
  // filter/sort/limit, trading completeness for speed on huge tables — the same
  // trade-off the summary endpoint's estimate mode makes. The subquery projects
  // the full list column set so the outer WHERE, ORDER BY, and duration
  // expression all resolve against it.
  const source = sampled
    ? `(SELECT ${getSysInvocationListColumns(this.features).join(', ')} FROM sys_invocation LIMIT ${sampleSize})`
    : 'sys_invocation';

  // Fast path: the unfiltered, unsorted "Processing" preset maps exactly to the
  // rows of sys_invocation_state (in-flight invocations), a much smaller table —
  // scanning it without a status filter avoids a filtered scan over the large
  // sys_invocation. Only valid with vqueues off; with vqueues the processing
  // statuses come from the queue overlay rather than this table. The detail
  // query below re-applies the status filter, so a row that just left the
  // processing set is dropped rather than shown.
  // A status filter on an invoked-derived status (running/backing-off/ready)
  // can't be pushed into the sys_invocation view's scan, forcing a full scan of
  // the large status table. Build the join over the raw tables instead, where a
  // pushable `ss.status = 'invoked'` prefilter prunes the scan before the join
  // (see convertInvocationsFiltersForBaseJoin). Skipped in sampled mode, which
  // caps the scan on the view by its own strategy.
  const useBaseJoin = !sampled && shouldUseBaseJoinForStatus(filters);

  const idQuery =
    !vqueueBackingOff && !sort && isProcessingPresetFilters(filters)
      ? `SELECT id FROM sys_invocation_state LIMIT ${INVOCATIONS_LIMIT}`
      : useBaseJoin
        ? `SELECT ${baseIdSelectColumns} FROM sys_invocation_status ss LEFT JOIN sys_invocation_state sis ON sis.id = ss.id ${convertInvocationsFiltersForBaseJoin(
            filters,
            { vqueueBackingOff },
          )} ${orderBy} LIMIT ${INVOCATIONS_LIMIT}`
        : `SELECT ${idSelectColumns} from ${source} ${convertInvocationsFilters(filters, { vqueueBackingOff })} ${orderBy} LIMIT ${INVOCATIONS_LIMIT}`;

  const { rows: idRows } = await this.query(idQuery);

  let invocations: ReturnType<typeof convertInvocation>[] = [];
  if (idRows.length > 0) {
    const ids = idRows.map(({ id }) => id);
    const detailColumns = `${getSysInvocationListColumns(this.features).join(', ')}, ${DURATION_EXPRESSION}`;
    // Detail rows and the vqueue overlay are fetched in parallel — both key off
    // the page's ids, so the vqueue lookup adds no extra round-trip.
    const [{ rows: invRows }, vqueueStatuses] = await Promise.all([
      this.query(
        `SELECT ${detailColumns} from sys_invocation ${convertInvocationsFilters(
          [
            {
              field: 'id',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ids,
            },
            ...filters,
          ],
          { vqueueBackingOff },
        )} ${orderBy}`,
      ),
      fetchVqueueStatuses(this, ids),
    ]);
    invocations = invRows.map((row) =>
      convertInvocation(row, vqueueStatuses.get(row.id)),
    );
  }

  // No total_count is sent — the UI derives the visible count from
  // rows.length and the "hit the cap" state from rows.length >= limit. The
  // overall total for status/service breakdowns comes from the summary
  // endpoint, not this list endpoint.
  return new Response(
    JSON.stringify({
      limit: INVOCATIONS_LIMIT,
      rows: invocations,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
