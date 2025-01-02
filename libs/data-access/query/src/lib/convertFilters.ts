import type { FilterItem } from '@restate/data-access/admin-api';

function convertFilterToSqlClause(filter: FilterItem) {
  return '';
}

export function convertFilters(filters: FilterItem[]) {
  const mappedFilters = filters.map(convertFilterToSqlClause).filter(Boolean);
  if (mappedFilters.length === 0) {
    return '';
  } else {
    return `WHERE ${mappedFilters.join(' AND ')}`;
  }
}
