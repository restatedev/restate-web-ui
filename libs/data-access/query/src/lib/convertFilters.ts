import type {
  FilterItem,
  FilterDateItem,
  FilterStringItem,
  FilterNumberItem,
  FilterStringListItem,
  FilterNullItem,
} from '@restate/data-access/admin-api-spec';

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
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `"${filter.field}" = '${filter.value}'`;
    case 'NOT_EQUALS':
      return `"${filter.field}" != '${filter.value}'`;
    case 'CONTAINS':
      return `"${filter.field}" LIKE '%${filter.value}%'`;
    case 'NOT_CONTAINS':
      return `"${filter.field}" NOT LIKE '%${filter.value}%'`;
    case 'IS NULL':
      return `"${filter.field}" IS NULL`;
    case 'IS NOT NULL':
      return `"${filter.field}" IS NOT NULL`;
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
      return `${filter.field} > '${filter.value}'`;
    case 'BEFORE':
      return `${filter.field} < '${filter.value}'`;
  }
}

function convertFilterStringListToSqlClause(
  filter: FilterStringListItem & Pick<FilterItem, 'field'>,
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

function negateOperator(op: 'AND' | 'OR'): 'AND' | 'OR' {
  switch (op) {
    case 'AND':
      return 'OR';
    case 'OR':
      return 'AND';
  }
}
function negateOperation(op: FilterItem['operation']): FilterItem['operation'] {
  switch (op) {
    case 'AFTER':
      return 'BEFORE';
    case 'BEFORE':
      return 'AFTER';
    case 'CONTAINS':
      return 'NOT_CONTAINS';
    case 'EQUALS':
      return 'NOT_EQUALS';
    case 'GREATER_THAN':
      return 'LESS_THAN_OR_EQUAL';
    case 'GREATER_THAN_OR_EQUAL':
      return 'LESS_THAN';
    case 'IN':
      return 'NOT_IN';
    case 'LESS_THAN':
      return 'GREATER_THAN_OR_EQUAL';
    case 'LESS_THAN_OR_EQUAL':
      return 'GREATER_THAN';
    case 'NOT_CONTAINS':
      return 'CONTAINS';
    case 'NOT_EQUALS':
      return 'EQUALS';
    case 'NOT_IN':
      return 'IN';
    case 'IS':
      return 'IS_NOT';
    case 'IS_NOT':
      return 'IS';
    case 'IS NULL':
      return 'IS NOT NULL';
    case 'IS NOT NULL':
      return 'IS NULL';
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

interface FilterGroup {
  filters: FilterItem[];
  operator: 'AND' | 'OR';
}
function getStatusFilterString(value?: string): {
  groups: FilterGroup[];
  operator: 'AND' | 'OR';
} {
  switch (value) {
    case 'succeeded':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
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
            ],
            operator: 'AND',
          },
        ],
      };
    case 'failed':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
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
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'NOT_IN',
                value: [
                  '[409] killed',
                  '[409] Killed',
                  '[409] canceled',
                  '[409] Canceled',
                  '[409] cancelled',
                  '[409] Cancelled',
                  '[409] Error 409',
                  '[409] error 409',
                ],
              },
            ],
            operator: 'AND',
          },
        ],
      };
    case 'killed':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
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
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'IN',
                value: ['[409] killed', '[409] Killed', '[409 Aborted] killed'],
              },
            ],
            operator: 'AND',
          },
        ],
      };
    case 'cancelled':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
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
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'IN',
                value: [
                  '[409] canceled',
                  '[409] Canceled',
                  '[409] Cancelled',
                  '[409] cancelled',
                ],
              },
            ],
            operator: 'AND',
          },
        ],
      };

    default:
      return {
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value,
              },
            ],
            operator: 'AND',
          },
        ],
        operator: 'AND',
      };
  }
}

// An invocation "belongs to" a deployment via either the deployment that last
// attempted it or the one it's pinned to. Both columns exist on the
// sys_invocation view; sys_invocation_status only has pinned_deployment_id
// (last_attempt_deployment_id lives in sys_invocation_state), so callers
// targeting that table pass a narrower field set.
const DEPLOYMENT_FILTER_FIELDS = [
  'last_attempt_deployment_id',
  'pinned_deployment_id',
] as const;

function deploymentPositiveFilter(
  value: string | undefined,
  fields: readonly string[],
) {
  return `(${fields
    .map((field) =>
      convertFilterStringToSqlClause({
        field,
        operation: 'EQUALS',
        type: 'STRING',
        value,
      }),
    )
    .join(' OR ')})`;
}

function deploymentNegativeFilter(
  value: string | undefined,
  fields: readonly string[],
) {
  return `(${fields
    .map(
      (field) =>
        `(${convertFilterStringToSqlClause({
          field,
          operation: 'NOT_EQUALS',
          type: 'STRING',
          value,
        })} OR ${convertFilterNullToSqlClause({
          field,
          operation: 'IS',
          type: 'NULL',
        })})`,
    )
    .join(' AND ')})`;
}

const VQUEUE_BACKING_OFF_SET =
  "SELECT entry_id FROM sys_vqueues WHERE stage = 'inbox' AND status = 'backing-off'";

// On the sys_invocation view a vqueue-backed backing-off invocation shows as
// 'ready'. Rewrite the 'backing-off'/'ready' status terms so the filter matches
// the overlaid status — and therefore the summary's buckets.
function vqueueStatusClause(value: string): string {
  return value === 'backing-off'
    ? `(status = 'backing-off' OR (status = 'ready' AND id IN (${VQUEUE_BACKING_OFF_SET})))`
    : `(status = 'ready' AND id NOT IN (${VQUEUE_BACKING_OFF_SET}))`;
}

function isVqueueRewrittenStatus(value?: string): boolean {
  return value === 'backing-off' || value === 'ready';
}

export function convertInvocationsFilters(
  filters: FilterItem[],
  options: {
    deploymentFields?: readonly string[];
    vqueueBackingOff?: boolean;
  } = {},
) {
  const deploymentFields = options.deploymentFields ?? DEPLOYMENT_FILTER_FIELDS;
  const vqueueBackingOff = options.vqueueBackingOff ?? false;
  const statusFilters = filters.filter((filter) => filter.field === 'status');
  const deploymentFilter = filters.find(
    (filter) => filter.field === 'deployment',
  );

  const mappedFilters = filters
    .filter(
      (filter) => filter.field !== 'status' && filter.field !== 'deployment',
    )
    .map(convertFilterToSqlClause)
    .filter(Boolean);

  if (deploymentFilter) {
    if (deploymentFilter.type === 'STRING') {
      if (deploymentFilter.operation === 'EQUALS') {
        mappedFilters.push(
          deploymentPositiveFilter(deploymentFilter.value, deploymentFields),
        );
      }
      if (deploymentFilter.operation === 'NOT_EQUALS') {
        mappedFilters.push(
          deploymentNegativeFilter(deploymentFilter.value, deploymentFields),
        );
      }
    }
    if (deploymentFilter.type === 'STRING_LIST') {
      if (deploymentFilter.operation === 'IN') {
        mappedFilters.push(
          `(${deploymentFilter.value
            .map((value) => deploymentPositiveFilter(value, deploymentFields))
            .join(' OR ')})`,
        );
      }
      if (deploymentFilter.operation === 'NOT_IN') {
        mappedFilters.push(
          `(${deploymentFilter.value
            .map((value) => deploymentNegativeFilter(value, deploymentFields))
            .join(' AND ')})`,
        );
      }
    }
  }
  if (statusFilters.length > 0) {
    statusFilters.forEach((statusFilter) => {
      // The backing-off/ready rewrite only changes the result when exactly one
      // of them is selected (it shifts vqueue-backed rows across that boundary).
      // When both are present the union equals the plain terms, so skip the
      // rewrite — and its sys_vqueues semi-joins — entirely.
      const statusValues = new Set<string | undefined>(
        statusFilter.type === 'STRING_LIST'
          ? statusFilter.value
          : statusFilter.type === 'STRING'
            ? [statusFilter.value]
            : [],
      );
      const rewriteStatus = (value?: string) =>
        vqueueBackingOff &&
        isVqueueRewrittenStatus(value) &&
        !statusValues.has(value === 'backing-off' ? 'ready' : 'backing-off');

      if (statusFilter.type === 'STRING') {
        if (rewriteStatus(statusFilter.value)) {
          mappedFilters.push(vqueueStatusClause(statusFilter.value as string));
        } else {
          const { groups, operator } = getStatusFilterString(
            statusFilter.value,
          );
          mappedFilters.push(
            groups
              .map(
                ({ filters, operator }) =>
                  `(${filters
                    .map(convertFilterToSqlClause)
                    .filter(Boolean)
                    .join(` ${operator} `)})`,
              )
              .filter(Boolean)
              .join(` ${operator} `),
          );
        }
      } else if (
        statusFilter.type === 'STRING_LIST' &&
        statusFilter.operation === 'IN'
      ) {
        mappedFilters.push(
          `(${statusFilter.value
            .map((value) => {
              if (rewriteStatus(value)) {
                return vqueueStatusClause(value);
              }
              const { groups, operator } = getStatusFilterString(value);
              return groups
                .map(
                  ({ filters, operator }) =>
                    `(${filters
                      .map(convertFilterToSqlClause)
                      .filter(Boolean)
                      .join(` ${operator} `)})`,
                )
                .filter(Boolean)
                .map((clause) => `(${clause})`)
                .join(` ${operator} `);
            })
            .map((clause) => `(${clause})`)
            .join(' OR ')})`,
        );
      } else if (
        statusFilter.type === 'STRING_LIST' &&
        statusFilter.operation === 'NOT_IN'
      ) {
        mappedFilters.push(
          `(${statusFilter.value
            .map((value) => {
              if (rewriteStatus(value)) {
                return `NOT ${vqueueStatusClause(value)}`;
              }
              const { groups, operator } = getStatusFilterString(value);

              return groups
                .map(({ filters, operator }) =>
                  filters
                    .map(
                      (filter) =>
                        ({
                          ...filter,
                          operation: negateOperation(filter.operation),
                        }) as FilterItem,
                    )
                    .map(convertFilterToSqlClause)
                    .filter(Boolean)
                    .join(` ${negateOperator(operator)} `),
                )
                .filter(Boolean)
                .map((clause) => `(${clause})`)
                .join(` ${negateOperator(operator)} `);
            })
            .map((clause) => `(${clause})`)
            .join(' AND ')})`,
        );
      }
    });
  }

  if (mappedFilters.length === 0) {
    return '';
  } else {
    return `WHERE ${mappedFilters.join(' AND ')}`;
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
