import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { INVOCATION_STATUS_DEFINITIONS } from '../../../invocationStatuses';
import {
  getInvocationListField,
  getInvocationListFieldOnTable,
  type InvocationListTable,
} from '../invocationListFields';
import {
  filterToSql,
  sqlStringList,
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import type { VqueueStage } from './types';

/** Maps API statuses to their VQueue stage/status predicates. */
export function vqueueStatusPredicate(
  statuses: readonly InvocationStatusV2[],
  alias: string,
) {
  if (statuses.length === 0) return 'FALSE';
  const statusesByStage = new Map<VqueueStage, Set<string> | undefined>();
  for (const status of statuses) {
    const vqueue = INVOCATION_STATUS_DEFINITIONS[status].vqueue;
    const existingStatuses = statusesByStage.get(vqueue.stage);
    if (!vqueue.statuses) {
      statusesByStage.set(vqueue.stage, undefined);
    } else if (
      existingStatuses !== undefined ||
      !statusesByStage.has(vqueue.stage)
    ) {
      const stageStatuses = existingStatuses ?? new Set<string>();
      for (const vqueueStatus of vqueue.statuses) {
        stageStatuses.add(vqueueStatus);
      }
      statusesByStage.set(vqueue.stage, stageStatuses);
    }
  }
  const clauses = [...statusesByStage].map(([stage, stageStatuses]) =>
    stageStatuses
      ? `(${alias}.stage = '${stage}' AND ${alias}.status IN (${sqlStringList([...stageStatuses])}))`
      : `${alias}.stage = '${stage}'`,
  );
  return clauses.length === 1
    ? (clauses[0] ?? 'FALSE')
    : `(${clauses.join(' OR ')})`;
}

/** Keeps stage keyspace pruning explicit beside the granular status clause. */
export function vqueueStagePredicate(
  statuses: readonly InvocationStatusV2[],
  alias: string,
) {
  if (statuses.length === 0) return 'FALSE';
  const stages = [
    ...new Set(
      statuses.map(
        (status) => INVOCATION_STATUS_DEFINITIONS[status].vqueue.stage,
      ),
    ),
  ];
  return stages.length === 1
    ? `${alias}.stage = '${stages[0]}'`
    : `${alias}.stage IN (${sqlStringList(stages)})`;
}

/** Returns predicates owned by VQueue entries. */
export function vqueueFilterClauses(
  filters: InvocationFilterV2[],
  table: Extract<
    InvocationListTable,
    'sys_vqueues' | 'sys_vqueue_entry_status'
  >,
  alias: string,
) {
  return (filters as FilterItem[]).flatMap((filter) => {
    if (getInvocationListField(filter.field)?.filter !== 'column') return [];
    const tableField = getInvocationListFieldOnTable(filter.field, table);
    if (!tableField) return [];
    const column = `${alias}.${tableField.column}`;
    const clause = filterToSql(filter, column);
    if (!clause) return [];
    if (
      filter.field === 'deployment' &&
      (filter.operation === 'NOT_IN' || filter.operation === 'NOT_EQUALS')
    ) {
      // SQL excludes NULL from negative comparisons. A NULL deployment means
      // "not pinned", so it should match NOT_EQUALS and NOT_IN filters.
      return [`(${clause} OR ${column} IS NULL)`];
    }
    return [clause];
  });
}

export function vqueueColumnNameForSort(field: InvocationSortV2['field']) {
  return getInvocationListFieldOnTable(field, 'sys_vqueues')?.column;
}

export function vqueueColumnForSort(
  field: InvocationSortV2['field'],
  alias: string,
) {
  const column = vqueueColumnNameForSort(field);
  return column ? `${alias}.${column}` : undefined;
}

export function vqueueMetadataCounterPredicate(
  statuses: readonly InvocationStatusV2[],
  alias: string,
) {
  if (statuses.length === 0) return 'FALSE';
  const stages = new Set(
    statuses.map(
      (status) => INVOCATION_STATUS_DEFINITIONS[status].vqueue.stage,
    ),
  );
  return `(${[...stages]
    .map((stage) => `${alias}.num_${stage} > 0`)
    .join(' OR ')})`;
}

export function vqueueMetadataPredicates(
  filters: InvocationFilterV2[],
  statuses: readonly InvocationStatusV2[] | undefined,
  alias: string,
) {
  const filterPredicates = (filters as FilterItem[]).flatMap((filter) => {
    const tableField = getInvocationListFieldOnTable(
      filter.field,
      'sys_vqueue_meta',
    );
    if (!tableField) return [];
    const clause = filterToSql(filter, `${alias}.${tableField.column}`);
    return clause ? [clause] : [];
  });
  return [
    ...filterPredicates,
    ...(statuses ? [vqueueMetadataCounterPredicate(statuses, alias)] : []),
  ];
}

/** Returns only columns required outside a sampled VQueue subquery. */
export function vqueueSampleColumns(
  filters: InvocationFilterV2[],
  statuses: readonly InvocationStatusV2[] | undefined,
  sortField: InvocationSortV2['field'] | undefined,
  requiredColumns: string[] = ['entry_id', 'entry_kind'],
) {
  const columns = new Set(requiredColumns);
  if (statuses) columns.add('stage');
  if (
    statuses?.some(
      (status) => INVOCATION_STATUS_DEFINITIONS[status].vqueue.statuses?.length,
    )
  ) {
    columns.add('status');
  }
  for (const filter of filters) {
    const tableField = getInvocationListFieldOnTable(
      filter.field,
      'sys_vqueues',
    );
    if (tableField) columns.add(tableField.column);
  }
  const sortColumn = sortField ? vqueueColumnNameForSort(sortField) : undefined;
  if (sortColumn) columns.add(sortColumn);
  return [...columns];
}
