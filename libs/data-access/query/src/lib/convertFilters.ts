import type {
  FilterItem,
  FilterDateItem,
  FilterStringItem,
  FilterNumberItem,
  FilterStringListItem,
} from '@restate/data-access/admin-api';

function convertFilterNumberToSqlClause(
  filter: FilterNumberItem & Pick<FilterItem, 'field'>
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `${filter.field} = '${filter.value}'`;
    case 'NOT_EQUALS':
      return `${filter.field} != '${filter.value}'`;
    case 'GREATER_THAN':
      return `${filter.field} > '${filter.value}'`;
    case 'LESS_THAN':
      return `${filter.field} < '${filter.value}'`;
  }
}

function convertFilterStringToSqlClause(
  filter: FilterStringItem & Pick<FilterItem, 'field'>
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `${filter.field} = '${filter.value}'`;
    case 'NOT_EQUALS':
      return `${filter.field} != '${filter.value}'`;
  }
}

function convertFilterDateToSqlClause(
  filter: FilterDateItem & Pick<FilterItem, 'field'>
) {
  switch (filter.operation) {
    case 'AFTER':
      return `${filter.field} > '${filter.value}'`;
    case 'BEFORE':
      return `${filter.field} < '${filter.value}'`;
  }
}

function convertFilterStringListToSqlClause(
  filter: FilterStringListItem & Pick<FilterItem, 'field'>
) {
  switch (filter.operation) {
    case 'IN':
      return `${filter.field} IN (${filter.value
        .map((value) => `'${value}'`)
        .join(', ')})`;
    case 'NOT_IN':
      return `${filter.field} NOT IN (${filter.value
        .map((value) => `'${value}'`)
        .join(', ')})`;
  }
}

function convertFilterToSqlClause(filter: FilterItem) {
  switch (filter.type) {
    case 'DATE':
      return convertFilterDateToSqlClause(filter);
    case 'STRING':
      return convertFilterStringToSqlClause(filter);
    case 'STRING_LIST':
      return convertFilterStringListToSqlClause(filter);
    case 'NUMBER':
      return convertFilterNumberToSqlClause(filter);
  }
}

export function convertFilters(filters: FilterItem[]) {
  const mappedFilters = filters.map(convertFilterToSqlClause).filter(Boolean);
  if (mappedFilters.length === 0) {
    return '';
  } else {
    return `WHERE ${mappedFilters.join(' AND ')}`;
  }
}
