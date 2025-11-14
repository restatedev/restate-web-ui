import type {
  FilterItem,
  RawInvocation,
} from '@restate/data-access/admin-api/spec';
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

  const minimumCountEstimatePromise = createdAfter
    ? Promise.resolve(undefined)
    : this.query(
        `SELECT COUNT(1) as total_count FROM (SELECT * FROM sys_invocation LIMIT ${COUNT_LIMIT}) ${convertInvocationsFilters(filters)}`,
      ).then(({ rows }) => rows?.at(0)?.total_count ?? 0);

  const invocationDataPromise = this.query(
    `SELECT id, created_at from sys_invocation ${convertInvocationsFilters(allFilters)} ORDER BY created_at ASC LIMIT ${pageSize}`,
  ).then(({ rows }) => rows as Pick<RawInvocation, 'id' | 'created_at'>[]);

  const [minimumCountEstimate, invocationData] = await Promise.all([
    minimumCountEstimatePromise,
    invocationDataPromise,
  ]);

  const invocationIds = invocationData.map(({ id }) => id);
  const lastCreatedAt = invocationData.at(-1)?.created_at;

  const receivedLessThanLimit =
    !createdAfter && invocationIds.length < pageSize;
  const { total: totalCount, isLowerBound } = countEstimate(
    receivedLessThanLimit,
    invocationIds.length,
    minimumCountEstimate,
  );

  return {
    invocationIds,
    ...(!createdAfter && {
      total: totalCount,
      isTotalLowerBound: isLowerBound,
    }),
    hasMore: invocationIds.length >= pageSize,
    lastCreatedAt,
  };
}
