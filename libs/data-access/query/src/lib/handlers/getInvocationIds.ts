import {
  TERMINAL_INVOCATION_STATUSES,
  type components,
  type FilterItem,
} from '@restate/data-access/admin-api-spec';
import { type QueryContext } from './shared';
import { selectInvocationCandidatesV2 } from './invocationsV2';

const DEFAULT_PAGE_SIZE = 1000;

type GetInvocationIdsOptions = {
  filters: FilterItem[];
  pageSize?: number;
  createdAfter?: string;
};

function toInvocationV2Filter(filter: FilterItem): FilterItem {
  if (filter.field !== 'status') return filter;
  const values =
    filter.type === 'STRING_LIST'
      ? filter.value
      : filter.type === 'STRING' && filter.value !== undefined
        ? [filter.value]
        : [];
  if (!values.includes('completed')) return filter;
  const operation =
    filter.operation === 'EQUALS' || filter.operation === 'IN'
      ? 'IN'
      : filter.operation === 'NOT_EQUALS' || filter.operation === 'NOT_IN'
        ? 'NOT_IN'
        : undefined;
  if (!operation) return filter;
  return {
    ...filter,
    type: 'STRING_LIST',
    operation,
    value: values.flatMap((value) =>
      value === 'completed' ? TERMINAL_INVOCATION_STATUSES : value,
    ),
  };
}

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

  const allFilters = [
    ...filters.map(toInvocationV2Filter),
    ...createdAfterFilter,
  ];
  if (pageSize <= 0) {
    return { invocationIds: [], hasMore: false, lastCreatedAt: undefined };
  }

  const data = await selectInvocationCandidatesV2(this, {
    filters: allFilters as components['schemas']['InvocationV2FilterItem'][],
    sort: { field: 'created_at', order: 'ASC' },
    mode: { type: 'exact' },
    includeInvocationDetails: true,
    limit: pageSize,
  });
  if ('error' in data) {
    throw new Error(data.error);
  }
  const rows = data.rows.slice(0, Math.min(pageSize, data.limit));
  if (data.partial && rows.length === 0) {
    throw new Error('Unable to continue partial batch invocation selection');
  }

  const invocationIds = rows.map(({ id }) => id);
  const lastCreatedAt = rows.at(-1)?.created_at;

  return {
    invocationIds,
    hasMore:
      data.rows.length > rows.length ||
      data.rows.length >= data.limit ||
      data.partial !== undefined,
    lastCreatedAt,
  };
}
