import type {
  FilterItem,
  FilterDateItem,
  FilterStringItem,
  FilterNumberItem,
  FilterStringListItem,
  FilterNullItem,
} from '@restate/data-access-admin-api-spec';
import { quoteSqlString } from './handlers/shared.js';

function convertFilterNumberToSqlClause(
  filter: FilterNumberItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `${filter.field} = ${filter.value}`;
    case 'NOT_EQUALS':
      return `${filter.field} != ${filter.value}`;
    case 'GREATER_THAN':
      return `${filter.field} > ${filter.value}`;
    case 'LESS_THAN':
      return `${filter.field} < ${filter.value}`;
    case 'GREATER_THAN_OR_EQUAL':
      return `${filter.field} >= ${filter.value}`;
    case 'LESS_THAN_OR_EQUAL':
      return `${filter.field} <= ${filter.value}`;
  }
}

function convertFilterStringToSqlClause(
  filter: FilterStringItem & Pick<FilterItem, 'field'>,
  field = `"${filter.field}"`,
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `${field} = ${quoteSqlString(filter.value ?? '')}`;
    case 'NOT_EQUALS':
      return `${field} != ${quoteSqlString(filter.value ?? '')}`;
    case 'CONTAINS':
      return `${field} LIKE ${quoteSqlString(`%${filter.value ?? ''}%`)}`;
    case 'NOT_CONTAINS':
      return `${field} NOT LIKE ${quoteSqlString(`%${filter.value ?? ''}%`)}`;
    case 'IS NULL':
      return `${field} IS NULL`;
    case 'IS NOT NULL':
      return `${field} IS NOT NULL`;
  }
}

function convertFilterNullToSqlClause(
  filter: FilterNullItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'IS':
      return `"${filter.field}" IS NULL`;
    case 'IS_NOT':
      return `"${filter.field}" IS NOT NULL`;
  }
}

function convertFilterDateToSqlClause(
  filter: FilterDateItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'AFTER':
      return `${filter.field} > ${quoteSqlString(String(filter.value))}`;
    case 'BEFORE':
      return `${filter.field} < ${quoteSqlString(String(filter.value))}`;
    case 'BETWEEN':
      if (filter.value != null && typeof filter.value === 'object') {
        return `(${filter.field} >= ${quoteSqlString(filter.value.start)} AND ${filter.field} < ${quoteSqlString(filter.value.end)})`;
      }
  }
  return undefined;
}

function convertFilterStringListToSqlClause(
  filter: FilterStringListItem & Pick<FilterItem, 'field'>,
  field = filter.field,
) {
  if (filter.value.length === 0) {
    return filter.operation === 'IN' ? 'FALSE' : 'TRUE';
  }
  switch (filter.operation) {
    case 'IN':
      return `${field} IN (${filter.value.map(quoteSqlString).join(', ')})`;
    case 'NOT_IN':
      return `${field} NOT IN (${filter.value.map(quoteSqlString).join(', ')})`;
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
    case 'NULL':
      return convertFilterNullToSqlClause(filter);
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
