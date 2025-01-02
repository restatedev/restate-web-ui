import type {
  FilterItem,
  FilterDateItem,
  FilterStringItem,
  FilterNumberItem,
  FilterStringListItem,
} from '@restate/data-access/admin-api/spec';

function convertFilterNumberToSqlClause(
  filter: FilterNumberItem & Pick<FilterItem, 'field'>
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
    case 'CONTAINS':
      return `${filter.field} LIKE '%${filter.value}%'`;
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

function getStatusFilterString(value?: string): FilterItem[] {
  switch (value) {
    case 'succeeded':
      return [
        {
          type: 'STRING',
          field: 'status',
          operation: 'EQUALS',
          value: 'completed',
        },
        {
          type: 'STRING',
          field: 'completion_result',
          operation: 'EQUALS',
          value: 'success',
        },
      ];
    case 'failed':
      return [
        {
          type: 'STRING',
          field: 'status',
          operation: 'EQUALS',
          value: 'completed',
        },
        {
          type: 'STRING',
          field: 'completion_result',
          operation: 'EQUALS',
          value: 'failure',
        },
      ];
    case 'killed':
      return [
        {
          type: 'STRING',
          field: 'status',
          operation: 'EQUALS',
          value: 'completed',
        },
        {
          type: 'STRING',
          field: 'completion_result',
          operation: 'EQUALS',
          value: 'failure',
        },
        {
          type: 'STRING',
          field: 'completion_failure',
          operation: 'CONTAINS',
          value: 'killed',
        },
      ];
    case 'cancelled':
      return [
        {
          type: 'STRING',
          field: 'status',
          operation: 'EQUALS',
          value: 'completed',
        },
        {
          type: 'STRING',
          field: 'completion_result',
          operation: 'EQUALS',
          value: 'failure',
        },
        {
          type: 'STRING',
          field: 'completion_failure',
          operation: 'CONTAINS',
          value: '[409]',
        },
      ];
    case 'retrying':
      return [
        {
          type: 'STRING_LIST',
          field: 'status',
          operation: 'IN',
          value: ['running', 'backing-off'],
        },
        {
          type: 'NUMBER',
          field: 'retry_count',
          operation: 'GREATER_THAN',
          value: 1,
        },
      ];

    default:
      return [
        {
          type: 'STRING',
          field: 'status',
          operation: 'EQUALS',
          value,
        },
      ];
  }
}

export function convertFilters(filters: FilterItem[]) {
  const statusFilter = filters.find((filter) => filter.field === 'status');

  const mappedFilters = filters
    .filter((filter) => filter.field !== 'status')
    .map(convertFilterToSqlClause)
    .filter(Boolean);

  if (statusFilter) {
    if (statusFilter.type === 'STRING') {
      mappedFilters.push(
        getStatusFilterString(statusFilter.value)
          .map(convertFilterToSqlClause)
          .filter(Boolean)
          .join(' AND ')
      );
    } else if (statusFilter.type === 'STRING_LIST') {
      mappedFilters.push(
        `(${statusFilter.value
          .map((value) =>
            getStatusFilterString(value)
              .map(convertFilterToSqlClause)
              .filter(Boolean)
              .join(' AND ')
          )
          .map((clause) => `(${clause})`)
          .join(' OR ')})`
      );
    }
  }

  if (mappedFilters.length === 0) {
    return '';
  } else {
    return `WHERE ${mappedFilters.join(' AND ')}`;
  }
}
