import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryId } from '../../../queryDefinitions';
import { usesStatsTables } from '../../../uiFeatures';
import {
  DEPLOYMENT_STATS,
  SERVICE_STATS,
  VIRTUAL_OBJECT_STATS,
  selectFromIndex,
  type IndexTable,
} from '../../indexes';
import type { QueryContext } from '../../shared';
import { filterToSql, type InvocationFilterV2 } from '../shared';
import {
  countStatsRows,
  filterStatsRows,
  summarizeStatsRows,
  type StatsRow,
} from './statsSummary';
import type { InvocationSummaryQueryResult } from './types';

function statsWhere<Key extends string>(
  columns: Readonly<Partial<Record<string, Key | null>>>,
  filters: InvocationFilterV2[],
) {
  const where: Partial<Record<Key, string[]>> = {};
  for (const filter of filters as FilterItem[]) {
    const column = columns[filter.field];
    const clause = column ? filterToSql(filter, column) : undefined;
    if (column && clause) where[column] = [...(where[column] ?? []), clause];
  }
  return where;
}

function statsSource<Row extends StatsRow, Key extends keyof Row & string>({
  table,
  id,
  columns,
  isPinned,
}: {
  table: IndexTable<Row, Key>;
  id: QueryId;
  columns: Readonly<Partial<Record<string, Key | null>>>;
  isPinned: (filters: InvocationFilterV2[]) => boolean;
}) {
  return {
    columns,
    isPinned,
    select: (context: QueryContext, filters: InvocationFilterV2[]) =>
      selectFromIndex(context, table, {
        where: statsWhere(columns, filters),
        id,
      }),
  };
}

const ROW_FILTER_FIELDS = new Set(['stage', 'status']);

const DEPLOYMENT_STATS_COLUMNS = {
  deployment: 'deployment_id',
  target_service_name: 'service_name',
} as const;

function pinnedValues(filters: InvocationFilterV2[], field: string) {
  const fieldFilters = (filters as FilterItem[]).filter(
    (filter) => filter.field === field,
  );
  const [filter] = fieldFilters;
  if (fieldFilters.length !== 1 || !filter) return undefined;
  const values =
    filter.type === 'STRING' && filter.operation === 'EQUALS'
      ? [filter.value]
      : filter.type === 'STRING_LIST' && filter.operation === 'IN'
        ? filter.value
        : undefined;
  return values?.filter((value): value is string => typeof value === 'string');
}

const STATS_SOURCES = [
  statsSource({
    table: SERVICE_STATS,
    id: 'stats/services',
    columns: {
      target_service_name: 'service_name',
      target_handler_name: 'handler',
    },
    isPinned: () => true,
  }),
  statsSource({
    table: DEPLOYMENT_STATS,
    id: 'stats/deployments',
    columns: DEPLOYMENT_STATS_COLUMNS,
    isPinned: (filters) => pinnedValues(filters, 'deployment') !== undefined,
  }),
  statsSource({
    table: VIRTUAL_OBJECT_STATS,
    id: 'stats/virtual-objects',
    columns: {
      target_service_ty: null,
      target_service_name: 'service_name',
      scope: 'scope',
      target_service_key: 'key',
      target_handler_name: 'handler',
    },
    isPinned: (filters) => {
      const types = pinnedValues(filters, 'target_service_ty');
      return types?.length === 1 && types[0] === 'virtual_object';
    },
  }),
];

type AnyStatsSource = (typeof STATS_SOURCES)[number];

function findStatsSource(
  context: Pick<QueryContext, 'features'>,
  filters: InvocationFilterV2[],
): AnyStatsSource | undefined {
  if (!usesStatsTables(context)) return undefined;
  return STATS_SOURCES.find(
    (source) =>
      filters.every(
        ({ field }) => ROW_FILTER_FIELDS.has(field) || field in source.columns,
      ) && source.isPinned(filters),
  );
}

export function canSummarizeInvocationsFromStats(
  context: Pick<QueryContext, 'features'>,
  filters: InvocationFilterV2[],
) {
  return findStatsSource(context, filters) !== undefined;
}

async function queryStatsRows(
  context: QueryContext,
  source: AnyStatsSource,
  filters: InvocationFilterV2[],
) {
  return filterStatsRows<StatsRow>(
    await source.select(context, filters),
    filters,
  );
}

export async function queryInvocationCountFromStats(
  context: QueryContext,
  filters: InvocationFilterV2[],
) {
  const source = findStatsSource(context, filters);
  if (!source) return undefined;
  return countStatsRows(await queryStatsRows(context, source, filters));
}

export async function queryInvocationSummaryFromStats(
  context: QueryContext,
  filters: InvocationFilterV2[],
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns',
): Promise<InvocationSummaryQueryResult | undefined> {
  const source = findStatsSource(context, filters);
  if (!source) return undefined;
  return summarizeStatsRows(
    await queryStatsRows(context, source, filters),
    view,
  );
}

export async function queryInvocationDeploymentBucketsFromStats(
  context: QueryContext,
  filters: InvocationFilterV2[],
) {
  if (
    !usesStatsTables(context) ||
    !filters.every(
      ({ field }) =>
        ROW_FILTER_FIELDS.has(field) || field in DEPLOYMENT_STATS_COLUMNS,
    )
  ) {
    return undefined;
  }
  const rows = await selectFromIndex(context, DEPLOYMENT_STATS, {
    where: statsWhere(DEPLOYMENT_STATS_COLUMNS, filters),
    id: 'stats/deployments',
  });
  return summarizeStatsRows(
    filterStatsRows(rows, filters, (row) => row.deployment_id),
    'all',
  ).serviceBuckets.map(({ service, count, statusBuckets }) => ({
    deployment: service,
    count,
    statusBuckets,
  }));
}
