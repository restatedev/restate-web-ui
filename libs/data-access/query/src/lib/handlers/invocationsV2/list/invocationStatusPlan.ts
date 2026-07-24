import type { FilterItem } from '@restate/data-access/admin-api-spec';
import {
  getInvocationListFieldOnTable,
  INVOCATION_LIST_FIELDS,
} from '../invocationListFields';
import type { InvocationFilterV2, InvocationSortV2 } from '../shared';

export type InvocationStateStatus = 'running' | 'backing-off';

const invocationStatusColumns =
  INVOCATION_LIST_FIELDS.status.tables.sys_invocation_status;

export function invocationStateOnlyStatuses(
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
): InvocationStateStatus[] | undefined {
  if (sort || filters.length !== 1) return undefined;
  const filter = filters[0] as FilterItem | undefined;
  if (filter?.field !== 'status') return undefined;

  const statuses =
    filter.type === 'STRING' && filter.operation === 'EQUALS'
      ? [filter.value]
      : filter.type === 'STRING_LIST' && filter.operation === 'IN'
        ? filter.value
        : [];
  const uniqueStatuses = [...new Set(statuses)];
  return uniqueStatuses.length > 0 &&
    uniqueStatuses.every(
      (status) => status === 'running' || status === 'backing-off',
    )
    ? (uniqueStatuses as InvocationStateStatus[])
    : undefined;
}

export function invocationStatusSampleColumns(
  filters: InvocationFilterV2[],
  sortField: InvocationSortV2['field'] | undefined,
  requiredColumns: string[] = ['id'],
): string {
  const columns = new Set(requiredColumns);
  for (const filter of filters) {
    const tableField = getInvocationListFieldOnTable(
      filter.field,
      'sys_invocation_status',
    );
    if (!tableField) continue;
    columns.add(tableField.column);
    if (filter.field !== 'status') continue;
    const values =
      filter.type === 'STRING_LIST'
        ? filter.value
        : filter.type === 'STRING'
          ? [filter.value]
          : [];
    if (
      values.some((value) =>
        ['succeeded', 'failed', 'cancelled', 'killed'].includes(value ?? ''),
      )
    ) {
      columns.add(invocationStatusColumns.supportingColumns.completionResult);
    }
    if (
      values.some((value) =>
        ['failed', 'cancelled', 'killed'].includes(value ?? ''),
      )
    ) {
      columns.add(invocationStatusColumns.supportingColumns.completionFailure);
    }
  }
  if (sortField) {
    const tableField = getInvocationListFieldOnTable(
      sortField,
      'sys_invocation_status',
    );
    if (tableField) columns.add(tableField.column);
  }
  return [...columns].join(', ');
}

export function needsInvocationStateJoin(
  filters: InvocationFilterV2[],
): boolean {
  return filters.some((filter) => {
    if (filter.field !== 'status') return false;
    const values =
      filter.type === 'STRING_LIST'
        ? filter.value
        : filter.type === 'STRING'
          ? [filter.value]
          : [];
    return values.some(
      (value) =>
        value === 'running' || value === 'backing-off' || value === 'ready',
    );
  });
}
