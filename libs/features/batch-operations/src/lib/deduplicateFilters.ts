import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryClauseOperationId } from '@restate/ui/query-builder';

const OPERATION_LABELS: Record<QueryClauseOperationId, string> = {
  EQUALS: 'is',
  NOT_EQUALS: 'is not',
  IN: 'is',
  NOT_IN: 'is not',
  BEFORE: 'before',
  AFTER: 'after',
  BETWEEN: 'between',
  LESS_THAN: 'less than',
  GREATER_THAN: 'greater than',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'does not contain',
  'IS NULL': 'is null',
  'IS NOT NULL': 'is not null',
};

const COMPLETED_INVOCATION_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
  'killed',
];

export function friendlyOperationLabel(operation: QueryClauseOperationId) {
  return OPERATION_LABELS[operation];
}

export function toInvocationV2SummaryFilter(filter: FilterItem): FilterItem {
  if (filter.field !== 'status' || !('value' in filter)) return filter;
  if (
    filter.type === 'STRING' &&
    filter.value === 'completed' &&
    (filter.operation === 'EQUALS' || filter.operation === 'NOT_EQUALS')
  ) {
    return {
      ...filter,
      type: 'STRING_LIST',
      operation: filter.operation === 'EQUALS' ? 'IN' : 'NOT_IN',
      value: COMPLETED_INVOCATION_STATUSES,
    };
  }
  if (
    filter.type === 'STRING_LIST' &&
    (filter.operation === 'IN' || filter.operation === 'NOT_IN') &&
    filter.value.includes('completed')
  ) {
    return {
      ...filter,
      value: filter.value.flatMap((value) =>
        value === 'completed' ? COMPLETED_INVOCATION_STATUSES : value,
      ),
    };
  }
  return filter;
}

function filterCriterionKey(filter: FilterItem) {
  if (
    'value' in filter &&
    filter.type === 'STRING' &&
    filter.operation === 'EQUALS' &&
    typeof filter.value === 'string'
  ) {
    return `${filter.field}:STRING_IS:${filter.value}`;
  }
  if (
    'value' in filter &&
    filter.type === 'STRING_LIST' &&
    filter.operation === 'IN' &&
    Array.isArray(filter.value) &&
    filter.value.length === 1
  ) {
    return `${filter.field}:STRING_IS:${filter.value[0]}`;
  }
  return JSON.stringify({
    field: filter.field,
    type: filter.type,
    operation: filter.operation,
    value: 'value' in filter ? filter.value : undefined,
  });
}

export function deduplicateFilters<T extends FilterItem>(filters: T[]) {
  const criteria = new Set<string>();
  return filters.filter((filter) => {
    const key = filterCriterionKey(filter);
    if (criteria.has(key)) return false;
    criteria.add(key);
    return true;
  });
}
