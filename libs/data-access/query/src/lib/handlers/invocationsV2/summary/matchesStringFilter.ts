import type { FilterItem } from '@restate/data-access-admin-api-spec';

export function matchesStringFilter(value: string, filter: FilterItem) {
  if (filter.type === 'STRING') {
    switch (filter.operation) {
      case 'EQUALS':
        return value === filter.value;
      case 'NOT_EQUALS':
        return value !== filter.value;
      case 'CONTAINS':
        return value.includes(filter.value ?? '');
      case 'NOT_CONTAINS':
        return !value.includes(filter.value ?? '');
      case 'IS NULL':
        return false;
      case 'IS NOT NULL':
        return true;
    }
  }
  if (filter.type === 'STRING_LIST') {
    const contains = filter.value.includes(value);
    return filter.operation === 'IN' ? contains : !contains;
  }
  if (filter.type === 'NULL') {
    return filter.operation === 'IS_NOT';
  }
  return true;
}
