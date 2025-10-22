import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { convertInvocation } from '../convertInvocation';
import { convertInvocationsFilters } from '../convertFilters';
import {
  queryFetcher,
  INVOCATIONS_LIMIT,
  COUNT_LIMIT,
  countEstimate,
} from './shared';

export async function listInvocations(
  baseUrl: string,
  headers: Headers,
  filters: FilterItem[],
) {
  const minimumCountEstimatePromise = queryFetcher(
    `SELECT COUNT(1) as total_count FROM (SELECT * FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
    {
      baseUrl,
      headers,
    },
  ).then(({ rows }) => rows?.at(0)?.total_count);
  const invocationsPromise = queryFetcher(
    `SELECT id from sys_invocation ${convertInvocationsFilters(filters)} ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
    {
      baseUrl,
      headers,
    },
  )
    .then(async ({ rows: idRows }) => {
      const receivedLessThanLimit = idRows.length < INVOCATIONS_LIMIT;

      if (idRows.length > 0) {
        const { rows: invRows } = await queryFetcher(
          `SELECT * from sys_invocation ${convertInvocationsFilters([
            {
              field: 'id',
              type: 'STRING_LIST',
              operation: 'IN',
              value: idRows.map(({ id }) => id),
            },
            ...filters,
          ])} ORDER BY modified_at DESC`,
          {
            baseUrl,
            headers,
          },
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
