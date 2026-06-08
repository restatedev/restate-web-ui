import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext, getSysInvocationListColumns } from './shared';

const COUNT_LIMIT = 200_000;
const INVOCATIONS_LIMIT = 100;

export async function countInvocations(
  this: QueryContext,
  filters: FilterItem[],
) {
  const columns = getSysInvocationListColumns(this.features).join(', ');
  const minimumCountEstimatePromise = this.query(
    `SELECT COUNT(1) as total_count FROM (SELECT ${columns} FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
  ).then(({ rows }) => rows?.at(0)?.total_count as number);
  const limitCountPromise = this.query(
    `SELECT id from sys_invocation ${convertInvocationsFilters(filters)} LIMIT ${INVOCATIONS_LIMIT}`,
  ).then(({ rows }) => rows.length);

  const [minimumCountEstimate, countWithLimit] = await Promise.all([
    minimumCountEstimatePromise,
    limitCountPromise,
  ]);

  if (countWithLimit < INVOCATIONS_LIMIT) {
    return Response.json({ count: countWithLimit, isLowerBound: false });
  } else {
    return Response.json({
      count: Math.max(countWithLimit, minimumCountEstimate),
      isLowerBound: true,
    });
  }
}
