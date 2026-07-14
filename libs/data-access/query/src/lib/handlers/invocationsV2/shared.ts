import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { INVOCATION_SUMMARY_STAGES as SHARED_INVOCATION_SUMMARY_STAGES } from '@restate/data-access/admin-api-spec';
import semverCoerce from 'semver/functions/coerce';
import semverGte from 'semver/functions/gte';
import type { QueryContext } from '../shared';
import {
  INVOCATION_STATUSES,
  type InvocationStatus,
} from '../../invocationStatuses';
import {
  getInvocationListField,
  isInvocationListFieldAvailableOnTable,
  type InvocationListTable,
} from './invocationListFields';

export { INVOCATION_STATUSES } from '../../invocationStatuses';

export const INVOCATIONS_V2_LIMIT = 250;
export const DEFAULT_SAMPLE_SIZE = 50_000;
export const MAX_SAMPLE_SIZE = 1_000_000;
export const VQUEUE_SERVICE_QUEUE_LIMIT = 100_000;

export type InvocationStatusV2 = InvocationStatus;
export const STATUSES_RESOLVED_FROM_VQUEUE = new Set<InvocationStatusV2>([
  'running',
  'backing-off',
  'ready',
  'yielded',
]);
export type InvocationSummaryStageV2 =
  components['schemas']['InvocationSummaryStageV2'];
export const INVOCATION_SUMMARY_STAGES: InvocationSummaryStageV2[] = [
  ...SHARED_INVOCATION_SUMMARY_STAGES,
];
export type InvocationFilterV2 =
  components['schemas']['InvocationV2FilterItem'];
export type InvocationSortV2 = components['schemas']['InvocationV2Sort'];
export type InvocationModeV2 = components['schemas']['InvocationQueryModeV2'];

export type ResolvedInvocationModeV2 =
  | { type: 'exact' }
  | { type: 'sampled'; sampleSize: number };

export function badRequest(message: string): Response {
  return Response.json({ message }, { status: 400 });
}

export function supportsInvocationV2Vqueues(context: QueryContext): boolean {
  if (!context.features.has('vqueues')) return false;
  const version = semverCoerce(context.restateVersion);
  return version ? semverGte(version, '1.7.2') : false;
}

export function hasCompleteVqueueInvocationPopulation(
  context: QueryContext,
): boolean {
  return (
    supportsInvocationV2Vqueues(context) &&
    !context.features.has('vqueues_migration_skip_completed')
  );
}

export function resolveInvocationModeV2(mode?: InvocationModeV2): {
  mode?: ResolvedInvocationModeV2;
  error?: string;
} {
  if (!mode || mode.type === 'exact') {
    return { mode: { type: 'exact' } };
  }
  const sampleSize = mode.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    return { error: 'mode.sampleSize must be a positive integer' };
  }
  if (sampleSize > MAX_SAMPLE_SIZE) {
    return {
      error: `mode.sampleSize must be at most ${MAX_SAMPLE_SIZE}`,
    };
  }
  return { mode: { type: 'sampled', sampleSize } };
}

export function validateInvocationFiltersV2(
  filters: InvocationFilterV2[],
): string | undefined {
  for (const filter of filters as FilterItem[]) {
    const field = getInvocationListField(filter.field);
    if (!field?.filter) {
      return `Unsupported invocation filter field: ${filter.field}`;
    }
    if (
      filter.field === 'id' &&
      !(
        (filter.type === 'STRING' &&
          filter.operation === 'EQUALS' &&
          typeof filter.value === 'string') ||
        (filter.type === 'STRING_LIST' && filter.operation === 'IN')
      )
    ) {
      return 'id supports only STRING EQUALS or STRING_LIST IN filters';
    }
    if (
      filter.field === 'id' &&
      filter.type === 'STRING_LIST' &&
      filter.value.length > INVOCATIONS_V2_LIMIT
    ) {
      return `id filters support at most ${INVOCATIONS_V2_LIMIT} values`;
    }
    if (filter.field === 'status') {
      if (filter.type !== 'STRING' && filter.type !== 'STRING_LIST') {
        return 'status must use a STRING or STRING_LIST filter';
      }
      if (
        !['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'].includes(filter.operation)
      ) {
        return `Unsupported status operation: ${filter.operation}`;
      }
      const values =
        filter.type === 'STRING_LIST' ? filter.value : [filter.value];
      const invalidStatusIndex = values.findIndex(
        (value) =>
          typeof value !== 'string' ||
          !INVOCATION_STATUSES.includes(value as InvocationStatusV2),
      );
      if (invalidStatusIndex !== -1) {
        return `Unknown invocation status: ${String(values[invalidStatusIndex])}`;
      }
    }
  }
  return undefined;
}

export function validateInvocationSortV2(
  sort?: InvocationSortV2,
): string | undefined {
  if (!sort) return undefined;
  if (!getInvocationListField(sort.field)?.sort) {
    return `Unsupported invocation sort field: ${sort.field}`;
  }
  if (sort.order !== 'ASC' && sort.order !== 'DESC') {
    return 'sort.order must be ASC or DESC';
  }
  return undefined;
}

export function validateInvocationFieldsForServer(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  tables: readonly InvocationListTable[],
): string | undefined {
  const unavailableFilter = filters.find((filter) =>
    tables.every(
      (table) =>
        !isInvocationListFieldAvailableOnTable(context, filter.field, table),
    ),
  );
  if (unavailableFilter) {
    return `${unavailableFilter.field} is not available on this Restate server`;
  }
  if (
    sort &&
    tables.every(
      (table) =>
        !isInvocationListFieldAvailableOnTable(context, sort.field, table),
    )
  ) {
    return `${sort.field} is not available on this Restate server`;
  }
  return undefined;
}

export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function sqlStringList(values: string[]): string {
  return values.map(sqlString).join(', ');
}

export function filterToSql(
  filter: FilterItem,
  column: string,
): string | undefined {
  if (filter.type === 'STRING') {
    switch (filter.operation) {
      case 'EQUALS':
        return `${column} = ${sqlString(filter.value ?? '')}`;
      case 'NOT_EQUALS':
        return `${column} != ${sqlString(filter.value ?? '')}`;
      case 'CONTAINS':
        return `${column} LIKE ${sqlString(`%${filter.value ?? ''}%`)}`;
      case 'NOT_CONTAINS':
        return `${column} NOT LIKE ${sqlString(`%${filter.value ?? ''}%`)}`;
      case 'IS NULL':
        return `${column} IS NULL`;
      case 'IS NOT NULL':
        return `${column} IS NOT NULL`;
    }
  }
  if (filter.type === 'STRING_LIST') {
    if (filter.value.length === 0) {
      return filter.operation === 'IN' ? 'FALSE' : 'TRUE';
    }
    return `${column} ${filter.operation === 'IN' ? 'IN' : 'NOT IN'} (${sqlStringList(filter.value)})`;
  }
  if (filter.type === 'NUMBER') {
    const operator = {
      EQUALS: '=',
      NOT_EQUALS: '!=',
      GREATER_THAN: '>',
      LESS_THAN: '<',
      GREATER_THAN_OR_EQUAL: '>=',
      LESS_THAN_OR_EQUAL: '<=',
    }[filter.operation];
    return operator ? `${column} ${operator} ${filter.value}` : undefined;
  }
  if (filter.type === 'DATE') {
    if (
      filter.operation === 'BETWEEN' &&
      filter.value &&
      typeof filter.value === 'object'
    ) {
      return `(${column} >= ${sqlString(filter.value.start)} AND ${column} < ${sqlString(filter.value.end)})`;
    }
    if (typeof filter.value === 'string') {
      return `${column} ${filter.operation === 'AFTER' ? '>' : '<'} ${sqlString(filter.value)}`;
    }
  }
  if (filter.type === 'NULL') {
    return `${column} IS ${filter.operation === 'IS_NOT' ? 'NOT ' : ''}NULL`;
  }
  return undefined;
}
