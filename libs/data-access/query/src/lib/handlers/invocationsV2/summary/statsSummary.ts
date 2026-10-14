import {
  getInvocationStatusesForStage,
  type FilterItem,
} from '@restate/data-access/admin-api-spec';
import {
  getInvocationStatusFromVqueue,
  type InvocationStatus,
  type VqueueStage,
} from '../../../invocationStatuses';
import type { InvocationFilterV2 } from '../shared';
import { resolveInvocationStatusSelection } from '../list/createVqueueListQueryPlan';
import { matchesStringFilter } from './matchesStringFilter';
import {
  LIVE_BUCKETS,
  SERVICE_STAGE_BUCKETS,
  STAGE_LABELS,
  TERMINAL_BUCKETS,
} from './queryInvocationSummaryFromVqueues';
import type {
  InvocationStageSummaryBucket,
  InvocationSummaryQueryResult,
} from './types';

const STAGES: VqueueStage[] = [
  'inbox',
  'running',
  'suspended',
  'paused',
  'finished',
];

export type StatsRow = {
  service_name: string;
  handler?: string | null;
  stage: VqueueStage;
  status: string;
  num_entries: number;
};

type InvocationStatsRow = {
  group: string;
  handler?: string;
  stage: VqueueStage;
  status: InvocationStatus;
  count: number;
};

function fieldFilters(filters: InvocationFilterV2[], field: string) {
  return (filters as FilterItem[]).filter((filter) => filter.field === field);
}

export function filterStatsRows<Row extends StatsRow>(
  rows: Row[],
  filters: InvocationFilterV2[],
  group: (row: Row) => string = (row) => row.service_name,
): InvocationStatsRow[] {
  const stageFilters = fieldFilters(filters, 'stage');
  const statusSelection = resolveInvocationStatusSelection(filters);

  return rows.flatMap((row) => {
    const status = getInvocationStatusFromVqueue(row);
    if (!status) return [];
    const matches =
      stageFilters.every((filter) => matchesStringFilter(row.stage, filter)) &&
      (statusSelection.type === 'all' || statusSelection.statuses.has(status));
    return matches
      ? [
          {
            group: group(row),
            ...(row.handler ? { handler: row.handler } : {}),
            stage: row.stage,
            status,
            count: Number(row.num_entries),
          },
        ]
      : [];
  });
}

export function countStatsRows(rows: InvocationStatsRow[]) {
  return rows.reduce((total, row) => total + row.count, 0);
}

function sumBy<Key>(
  rows: InvocationStatsRow[],
  key: (row: InvocationStatsRow) => Key,
) {
  const totals = new Map<Key, number>();
  for (const row of rows) {
    totals.set(key(row), (totals.get(key(row)) ?? 0) + row.count);
  }
  return totals;
}

export function summarizeStatsRows(
  statsRows: InvocationStatsRow[],
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns',
): InvocationSummaryQueryResult {
  const includesCompletedStage = view !== 'live-stages';
  const rows = statsRows.filter(
    (row) => includesCompletedStage || row.stage !== 'finished',
  );
  const stageCounts = sumBy(rows, (row) => row.stage);
  const statusCounts = sumBy(rows, (row) => row.status);
  const serviceStageCounts = new Map<string, Map<VqueueStage, number>>();
  const serviceStatusCounts = new Map<string, Map<InvocationStatus, number>>();
  const handlerStageCounts = new Map<
    string,
    Map<string, Map<VqueueStage, number>>
  >();
  for (const row of rows) {
    if (row.handler) {
      const handlers = handlerStageCounts.get(row.group) ?? new Map();
      const stages = handlers.get(row.handler) ?? new Map();
      stages.set(row.stage, (stages.get(row.stage) ?? 0) + row.count);
      handlers.set(row.handler, stages);
      handlerStageCounts.set(row.group, handlers);
    }
    const stages = serviceStageCounts.get(row.group) ?? new Map();
    stages.set(row.stage, (stages.get(row.stage) ?? 0) + row.count);
    serviceStageCounts.set(row.group, stages);
    const statuses = serviceStatusCounts.get(row.group) ?? new Map();
    statuses.set(row.status, (statuses.get(row.status) ?? 0) + row.count);
    serviceStatusCounts.set(row.group, statuses);
  }

  const stageBuckets: InvocationStageSummaryBucket[] = STAGES.filter(
    (stage) => includesCompletedStage || stage !== 'finished',
  ).map((stage) => ({
    key: stage,
    label: STAGE_LABELS[stage],
    statuses: getInvocationStatusesForStage(stage),
    count: stageCounts.get(stage) ?? 0,
    breakdownIsPartial: false,
    breakdownCoverage: 'full',
    breakdownCanRefine: false,
  }));
  const statusDefinitions = [
    ...LIVE_BUCKETS,
    ...(includesCompletedStage ? TERMINAL_BUCKETS : []),
  ];
  const groupStageBuckets = (counts: Map<VqueueStage, number>) =>
    SERVICE_STAGE_BUCKETS.filter(
      (definition) => includesCompletedStage || definition.key !== 'finished',
    ).map((definition) => ({
      ...definition,
      count: counts.get(definition.key as VqueueStage) ?? 0,
    }));
  const sumCounts = (buckets: { count: number }[]) =>
    buckets.reduce((total, bucket) => total + bucket.count, 0);

  return {
    stageBuckets,
    stageCountsArePartial: false,
    statusBuckets: statusDefinitions.map((definition) => ({
      ...definition,
      count: statusCounts.get(definition.key as InvocationStatus) ?? 0,
    })),
    serviceBuckets: [...serviceStageCounts]
      .map(([service, counts]) => {
        const statusBuckets = groupStageBuckets(counts);
        const statuses = serviceStatusCounts.get(service);
        return {
          service,
          count: sumCounts(statusBuckets),
          statusBuckets,
          handlerBuckets: [...(handlerStageCounts.get(service) ?? [])].map(
            ([handler, handlerCounts]) => {
              const handlerBuckets = groupStageBuckets(handlerCounts);
              return {
                handler,
                count: sumCounts(handlerBuckets),
                statusBuckets: handlerBuckets,
              };
            },
          ),
          statusBreakdown: statusDefinitions.map((definition) => ({
            ...definition,
            count: statuses?.get(definition.key as InvocationStatus) ?? 0,
          })),
        };
      })
      .sort((left, right) =>
        right.count !== left.count
          ? right.count - left.count
          : left.service.localeCompare(right.service),
      ),
    isPartial: false,
  };
}
