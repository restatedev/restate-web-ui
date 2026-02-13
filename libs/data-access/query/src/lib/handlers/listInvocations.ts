import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api/spec';
import { convertInvocation } from '../convertInvocation';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext, SYS_INVOCATION_LIST_COLUMNS } from './shared';

const INVOCATIONS_LIMIT = 250;
const COUNT_LIMIT = 50000;
const DURATION_EXPRESSION =
  'COALESCE(completed_at, now()) - created_at AS duration';

const STATE_ONLY_COLUMNS = [
  'retry_count',
  'next_retry_at',
  'last_start_at',
  'last_attempt_deployment_id',
  'last_attempt_server',
  'last_failure',
  'last_failure_error_code',
  'last_failure_related_command_index',
  'last_failure_related_command_name',
  'last_failure_related_command_type',
  'last_failure_related_entry_index',
  'last_failure_related_entry_name',
  'last_failure_related_entry_type',
  'in_flight',
];

function needsStateTable(
  filterClause: string,
  sort: { field: string },
): boolean {
  if (STATE_ONLY_COLUMNS.some((col) => sort.field === col)) return true;
  if (
    filterClause &&
    STATE_ONLY_COLUMNS.some((col) => filterClause.includes(col))
  )
    return true;
  return false;
}

function countEstimate(
  receivedLessThanLimit: boolean,
  rows: number,
  minimumCountEstimate: number,
): { total_count: number; total_count_lower_bound: boolean } {
  if (receivedLessThanLimit) {
    return { total_count: rows, total_count_lower_bound: false };
  } else {
    return {
      total_count: Math.max(rows, minimumCountEstimate),
      total_count_lower_bound: true,
    };
  }
}

export async function listInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sort: components['schemas']['ListInvocationsRequestBody']['sort'] = {
    field: 'modified_at',
    order: 'DESC',
  },
) {
  const filterClause = convertInvocationsFilters(filters);
  const table = needsStateTable(filterClause, sort)
    ? 'sys_invocation'
    : 'sys_invocation_status';

  const minimumCountEstimatePromise = this.query(
    `SELECT COUNT(1) as total_count FROM (SELECT * FROM ${table} LIMIT ${COUNT_LIMIT}) ${filterClause}`,
  ).then(({ rows }) => rows?.at(0)?.total_count);

  const isSortByDuration = sort.field === 'duration';
  const idSelectColumns = isSortByDuration
    ? `id, ${DURATION_EXPRESSION}`
    : 'id';

  const invocationsPromise = this.query(
    `SELECT ${idSelectColumns} from ${table} ${filterClause} ORDER BY ${sort.field} ${sort.order} LIMIT ${INVOCATIONS_LIMIT}`,
  )
    .then(async ({ rows: idRows }) => {
      const receivedLessThanLimit = idRows.length < INVOCATIONS_LIMIT;

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

        return { rows: invRows, receivedLessThanLimit };
      } else {
        return { rows: [], receivedLessThanLimit };
      }
    })
    .then(({ rows, receivedLessThanLimit }) => ({
      rows: rows.map(convertInvocation),
      receivedLessThanLimit,
    }));

  const [minimumCountEstimate, { rows: invocations, receivedLessThanLimit }] =
    await Promise.all([minimumCountEstimatePromise, invocationsPromise]);

  const { total_count, total_count_lower_bound } = countEstimate(
    receivedLessThanLimit,
    invocations.length,
    minimumCountEstimate,
  );

  return new Response(
    JSON.stringify({
      limit: INVOCATIONS_LIMIT,
      total_count,
      total_count_lower_bound,
      rows: invocations,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
