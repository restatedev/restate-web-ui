import type {
  FilterItem,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

const DEFAULT_PAGE_SIZE = 1000;

type GetInvocationIdsOptions = {
  filters: FilterItem[];
  pageSize?: number;
  createdAfter?: string;
};

export async function getInvocationIds(
  this: QueryContext,
  {
    filters,
    pageSize = DEFAULT_PAGE_SIZE,
    createdAfter,
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

  const invocationData = await this.query(
    `SELECT id, created_at from sys_invocation ${convertInvocationsFilters(allFilters)} ORDER BY created_at ASC LIMIT ${pageSize}`,
  ).then(({ rows }) => rows as Pick<RawInvocation, 'id' | 'created_at'>[]);

  const invocationIds = invocationData.map(({ id }) => id);
  const lastCreatedAt = invocationData.at(-1)?.created_at;

  return {
    invocationIds,
    hasMore: invocationIds.length >= pageSize && pageSize !== 0,
    lastCreatedAt,
  };
}
