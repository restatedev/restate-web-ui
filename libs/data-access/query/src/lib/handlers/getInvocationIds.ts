import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

const COUNT_LIMIT = 50000;
const DEFAULT_PAGE_SIZE = 50;

type GetInvocationIdsOptions = {
  filters: FilterItem[];
  pageSize?: number;
  createdAfter?: string;
  total?: number;
};

function countEstimate(
  receivedLessThanLimit: boolean,
  rows: number,
  minimumCountEstimate: number,
) {
  if (receivedLessThanLimit) {
    return { total: rows, isLowerBound: false };
  }
  return { total: Math.max(rows, minimumCountEstimate), isLowerBound: true };
}

export async function getInvocationIds(
  this: QueryContext,
  {
    filters,
    pageSize = DEFAULT_PAGE_SIZE,
    createdAfter,
    total,
  }: GetInvocationIdsOptions,
) {
  const createdAfterFilter: FilterItem[] = createdAfter
    ? [
        {
          field: 'created_at',
          type: 'DATE',
          operation: 'AFTER',
          value: createdAfter,
        },
      ]
    : [];

  const allFilters = [...filters, ...createdAfterFilter];

  const minimumCountEstimatePromise =
    total !== undefined
      ? Promise.resolve(total)
      : this.query(
          `SELECT COUNT(1) as total_count FROM (SELECT * FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
        ).then(({ rows }) => rows?.at(0)?.total_count ?? 0);

  const invocationIdsPromise = this.query(
    `SELECT id from sys_invocation ${convertInvocationsFilters(allFilters)} ORDER BY created_at DESC LIMIT ${pageSize}`,
  ).then(({ rows }) => rows.map(({ id }) => id as string));

  const [minimumCountEstimate, invocationIds] = await Promise.all([
    minimumCountEstimatePromise,
    invocationIdsPromise,
  ]);

  const receivedLessThanLimit =
    !createdAfter && invocationIds.length < pageSize;
  const { total: totalCount, isLowerBound } = countEstimate(
    receivedLessThanLimit,
    invocationIds.length,
    minimumCountEstimate,
  );

  return {
    invocationIds,
    total: totalCount,
    isTotalLowerBound: isLowerBound,
    hasMore: invocationIds.length >= pageSize,
  };
}
