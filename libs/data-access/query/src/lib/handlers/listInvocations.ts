import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import { convertInvocationsFilters } from '../convertFilters';
import {
  type QueryContext,
  SYS_INVOCATION_LIST_COLUMNS,
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

  const invocationsPromise = this.query(
    `SELECT ${idSelectColumns} from sys_invocation ${convertInvocationsFilters(filters)} ORDER BY ${sort.field} ${sort.order} LIMIT ${INVOCATIONS_LIMIT}`,
  )
    .then(async ({ rows: idRows }) => {
      if (idRows.length > 0) {
        const detailColumns = `${SYS_INVOCATION_LIST_COLUMNS.join(', ')}, ${DURATION_EXPRESSION}`;
        const { rows: invRows } = await this.query(
          `SELECT ${detailColumns} from sys_invocation ${convertInvocationsFilters(
            [
              {
                field: 'id',
                type: 'STRING_LIST',
                operation: 'IN',
                value: idRows.map(({ id }) => id),
              },
              ...filters,
            ],
          )} ORDER BY ${sort.field} ${sort.order}`,
        );

        return invRows;
      } else {
        return [];
      }
    })
    .then((rows) => rows.map(convertInvocation));

  const invocations = await invocationsPromise;

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
