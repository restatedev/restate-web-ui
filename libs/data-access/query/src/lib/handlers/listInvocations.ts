import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import { convertInvocationsFilters } from '../convertFilters';
import {
  type QueryContext,
  getSysInvocationListColumns,
  DURATION_EXPRESSION,
} from './shared';
import { fetchVqueueStatuses, vqueueStatusEnabled } from './vqueue';

const INVOCATIONS_LIMIT = 250;
const DEFAULT_SAMPLE_SIZE = 50000;

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

  const { rows: idRows } = await this.query(
    `SELECT ${idSelectColumns} from ${source} ${convertInvocationsFilters(filters, { vqueueBackingOff })} ${orderBy} LIMIT ${INVOCATIONS_LIMIT}`,
  );

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
