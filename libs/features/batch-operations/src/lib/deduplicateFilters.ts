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

export function friendlyOperationLabel(operation: QueryClauseOperationId) {
  return OPERATION_LABELS[operation];
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
