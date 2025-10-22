import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { convertInvocation } from '../convertInvocation';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

const INVOCATIONS_LIMIT = 250;
const COUNT_LIMIT = 50000;

function countEstimate(
  receivedLessThanLimit: boolean,
  rows: number,
  minimumCountEstimate: number,
): { total_count: number; total_count_lower_bound: boolean } {
  if (receivedLessThanLimit) {
    return { total_count: rows, total_count_lower_bound: false };
  } else if (rows > minimumCountEstimate) {
    return { total_count: rows, total_count_lower_bound: true };
  } else {
    return {
      total_count: minimumCountEstimate,
      total_count_lower_bound: true,
    };
  }
}

export async function listInvocations(
  this: QueryContext,
  filters: FilterItem[],
) {
  const minimumCountEstimatePromise = this.query(
    `SELECT COUNT(1) as total_count FROM (SELECT * FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
  ).then(({ rows }) => rows?.at(0)?.total_count);

  const invocationsPromise = this.query(
    `SELECT id from sys_invocation ${convertInvocationsFilters(filters)} ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
  )
    .then(async ({ rows: idRows }) => {
      const receivedLessThanLimit = idRows.length < INVOCATIONS_LIMIT;

      if (idRows.length > 0) {
        const { rows: invRows } = await this.query(
          `SELECT * from sys_invocation ${convertInvocationsFilters([
            {
              field: 'id',
              type: 'STRING_LIST',
              operation: 'IN',
              value: idRows.map(({ id }) => id),
            },
            ...filters,
          ])} ORDER BY modified_at DESC`,
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
