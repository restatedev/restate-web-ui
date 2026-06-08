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

const INVOCATIONS_LIMIT = 250;

export async function listInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sort: components['schemas']['ListInvocationsRequestBody']['sort'] = {
    field: 'modified_at',
    order: 'DESC',
  },
) {
  const isSortByDuration = sort.field === 'duration';
  const idSelectColumns = isSortByDuration
    ? `id, ${DURATION_EXPRESSION}`
    : 'id';

  const { rows: idRows } = await this.query(
    `SELECT ${idSelectColumns} from sys_invocation ${convertInvocationsFilters(filters)} ORDER BY ${sort.field} ${sort.order} LIMIT ${INVOCATIONS_LIMIT}`,
  );

  let invocations: ReturnType<typeof convertInvocation>[] = [];
  if (idRows.length > 0) {
    const detailColumns = `${getSysInvocationListColumns(this.features).join(', ')}, ${DURATION_EXPRESSION}`;
    const { rows: invRows } = await this.query(
      `SELECT ${detailColumns} from sys_invocation ${convertInvocationsFilters([
        {
          field: 'id',
          type: 'STRING_LIST',
          operation: 'IN',
          value: idRows.map(({ id }) => id),
        },
        ...filters,
      ])} ORDER BY ${sort.field} ${sort.order}`,
    );
    invocations = invRows.map(convertInvocation);
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
