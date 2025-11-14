import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

const COUNT_LIMIT = 50000;

export async function countInvocations(
  this: QueryContext,
  filters: FilterItem[],
) {
  const total = await this.query(
    `SELECT COUNT(1) as total_count FROM (SELECT * FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
  ).then(({ rows }) => rows?.at(0)?.total_count as number);

  return Response.json({ total });
}
