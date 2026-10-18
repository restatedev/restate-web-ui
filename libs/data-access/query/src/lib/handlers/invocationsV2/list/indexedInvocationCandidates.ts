import type { FilterItem } from '@restate/data-access-admin-api-spec';
import type { QueryId } from '../../../queryDefinitions.js';
import { usesIndexesV1 } from '../../../uiFeatures.js';
import {
  countFromIndex,
  ENTRY_BY_SERVICE,
  ENTRY_BY_STAGE,
  ENTRY_BY_VIRTUAL_OBJECT,
  selectFromIndex,
  type IndexTable,
  type KeyValue,
} from '../../indexes/index.js';
import { quoteSqlString, type QueryContext } from '../../shared.js';
import type { InvocationFilterV2, InvocationSortV2 } from '../shared.js';
import { resolveWholeStages, VQUEUE_STAGES } from './wholeStages.js';
import type { InvocationCandidate } from './types.js';

type EntryIndexPlan = {
  select: (options: {
    sort?: InvocationSortV2;
    limit: number;
  }) => Promise<{ entry_id: string }[]>;
  count: () => Promise<number>;
};

type EntryIndexPlanner = {
  filters: Readonly<Partial<Record<string, string>>>;
  sorts: Readonly<Partial<Record<string, string>>>;
  requiresVirtualObjectServices: boolean;
  plan: (
    context: QueryContext,
    keys: Partial<Record<string, KeyValue>>,
  ) => EntryIndexPlan;
};

function entryIndexPlanner<
  Row extends { entry_id: string },
  Key extends keyof Row & string,
>(
  table: IndexTable<Row, Key>,
  ids: { select: QueryId; count: QueryId },
  requiresVirtualObjectServices = false,
): EntryIndexPlanner {
  return {
    filters: table.filters ?? {},
    sorts: table.sorts ?? {},
    requiresVirtualObjectServices,
    plan: (context, keys) => ({
      select: ({ sort, limit }) =>
        selectFromIndex(context, table, {
          keys,
          columns: ['entry_id'],
          orderBy: sort
            ? `${table.sorts?.[sort.field]} ${sort.order}`
            : undefined,
          limit,
          id: ids.select,
        }),
      count: () => countFromIndex(context, table, { keys, id: ids.count }),
    }),
  };
}

const ENTRY_INDEX_PLANNERS = [
  entryIndexPlanner(ENTRY_BY_STAGE, {
    select: 'indexes/entries-by-stage',
    count: 'indexes/count-entries-by-stage',
  }),
  entryIndexPlanner(ENTRY_BY_SERVICE, {
    select: 'indexes/entries-by-service',
    count: 'indexes/count-entries-by-service',
  }),
  entryIndexPlanner(
    ENTRY_BY_VIRTUAL_OBJECT,
    {
      select: 'indexes/entries-by-virtual-object',
      count: 'indexes/count-entries-by-virtual-object',
    },
    true,
  ),
];

export const ENTRY_INDEX_FILTER_FIELDS = new Set(
  ENTRY_INDEX_PLANNERS.flatMap(({ filters }) => Object.keys(filters)),
);

function fieldFilters(filters: InvocationFilterV2[], field: string) {
  return (filters as FilterItem[]).filter((filter) => filter.field === field);
}

function equalityValues(filters: FilterItem[]): string[] | undefined {
  if (filters.length !== 1) return undefined;
  const [filter] = filters;
  const values =
    filter?.type === 'STRING' && filter.operation === 'EQUALS'
      ? [filter.value]
      : filter?.type === 'STRING_LIST' && filter.operation === 'IN'
        ? filter.value
        : undefined;
  return values?.filter((value): value is string => typeof value === 'string');
}

async function areVirtualObjectServices(
  context: QueryContext,
  services: KeyValue,
) {
  if (!Array.isArray(services) || services.length === 0) return false;
  const { rows } = await context.query(
    `SELECT name FROM sys_service WHERE ty = 'virtual_object' AND name IN (${services.map(quoteSqlString).join(', ')})`,
    'indexes/service-type',
  );
  return rows.length === new Set(services).size;
}

function indexKeys(
  planner: EntryIndexPlanner,
  filters: InvocationFilterV2[],
  stages: string[],
) {
  const keys: Partial<Record<string, KeyValue>> = {};
  for (const [field, column] of Object.entries(planner.filters)) {
    if (!column) continue;
    if (column === 'stage') {
      keys[column] =
        stages.length === VQUEUE_STAGES.length ? undefined : stages;
      continue;
    }
    const filtersOnField = fieldFilters(filters, field);
    if (filtersOnField.length === 0) continue;
    const values = equalityValues(filtersOnField);
    if (!values) return undefined;
    keys[column] = values;
  }
  return keys;
}

async function createEntryIndexPlan(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort?: InvocationSortV2,
): Promise<EntryIndexPlan | undefined> {
  if (!usesIndexesV1(context)) return undefined;
  const planner = ENTRY_INDEX_PLANNERS.find(
    (candidate) =>
      filters.every((filter) => filter.field in candidate.filters) &&
      (!sort || sort.field in candidate.sorts),
  );
  const stages = resolveWholeStages(filters);
  if (!planner || !stages) return undefined;
  const keys = indexKeys(planner, filters, stages);
  if (!keys) return undefined;
  if (
    planner.requiresVirtualObjectServices &&
    !(await areVirtualObjectServices(context, keys['service_name']))
  ) {
    return undefined;
  }
  return planner.plan(context, keys);
}

export async function selectInvocationCandidatesFromIndexes(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  limit: number,
): Promise<InvocationCandidate[] | undefined> {
  const plan = await createEntryIndexPlan(context, filters, sort);
  if (!plan) return undefined;
  const rows = await plan.select({ sort, limit });
  return rows.map(({ entry_id }) => ({ id: entry_id }));
}

export async function countInvocationsFromIndexes(
  context: QueryContext,
  filters: InvocationFilterV2[],
): Promise<number | undefined> {
  const plan = await createEntryIndexPlan(context, filters);
  if (!plan) return undefined;
  return plan.count();
}
