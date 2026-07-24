import {
  getInvocationStatusesForStage,
  INVOCATION_STATUS_DEFINITIONS,
  INVOCATION_SUMMARY_STAGES,
  type FilterItem,
} from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../../shared';
import {
  getInvocationStatusFromVqueue,
  type InvocationStatus,
} from '../../../invocationStatuses';
import {
  filterToSql,
  VQUEUE_SERVICE_QUEUE_LIMIT,
  type InvocationFilterV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import { getInvocationListFieldOnTable } from '../invocationListFields';
import { invocationStatusFilterClauses } from '../list/invocationStatusFilters';
import { invocationStatusSampleColumns } from '../list/invocationStatusPlan';
import type {
  InvocationStatusSummaryBucket,
  InvocationSummaryQueryResult,
} from './types';

type MetaRow = {
  service_name?: string;
  inbox?: number | string;
  running?: number | string;
  suspended?: number | string;
  paused?: number | string;
  finished?: number | string;
};

type StatusRow = {
  service_name?: string;
  status?: string;
  count?: number | string;
};

const STATUS_BUCKETS = INVOCATION_STATUS_DEFINITIONS.map(
  ({ key, label, stage }) => ({ key, label, stage, statuses: [key] }),
);

function withoutStage({
  key,
  label,
  statuses,
}: (typeof STATUS_BUCKETS)[number]) {
  return { key, label, statuses };
}

const LIVE_BUCKETS: Omit<InvocationStatusSummaryBucket, 'count'>[] =
  STATUS_BUCKETS.filter(({ stage }) => stage !== 'finished').map(withoutStage);

const TERMINAL_BUCKETS: Omit<InvocationStatusSummaryBucket, 'count'>[] =
  STATUS_BUCKETS.filter(({ stage }) => stage === 'finished').map(withoutStage);

const GROUPED_TERMINAL_BUCKETS: Omit<InvocationStatusSummaryBucket, 'count'>[] =
  [
    { key: 'succeeded', label: 'Succeeded', statuses: ['succeeded'] },
    {
      key: 'failed',
      label: 'Failed, cancelled or killed',
      statuses: ['failed', 'cancelled', 'killed'],
    },
  ];

const STAGE_LABELS = {
  inbox: 'Inbox',
  running: 'Running',
  suspended: 'Suspended',
  paused: 'Paused',
  finished: 'Completed',
} as const;

const SERVICE_STAGE_BUCKETS: Omit<InvocationStatusSummaryBucket, 'count'>[] =
  INVOCATION_SUMMARY_STAGES.map((stage) => ({
    key: stage,
    label: STAGE_LABELS[stage],
    statuses: getInvocationStatusesForStage(stage),
  }));

function countRows(rows: StatusRow[]) {
  return rows.reduce((total, row) => total + Number(row.count ?? 0), 0);
}

function metadataFilterClauses(filters: InvocationFilterV2[], alias: string) {
  return (filters as FilterItem[]).flatMap((filter) => {
    const field = getInvocationListFieldOnTable(
      filter.field,
      'sys_vqueue_meta',
    );
    if (!field) return [];
    const column = `${alias}.${field.column}`;
    const clause = filterToSql(filter, column);
    return clause ? [clause] : [];
  });
}

function metadataWhere(
  filters: InvocationFilterV2[],
  activityPredicates: string[],
  alias: string,
) {
  const filtersSql = metadataFilterClauses(filters, alias);
  if (filtersSql.length === 0) return activityPredicates.join('\n        OR ');
  return `${filtersSql.join('\n        AND ')}
        AND (
          ${activityPredicates.join('\n          OR ')}
        )`;
}

function matchingQueueFilter(
  filters: InvocationFilterV2[],
  counter: 'num_inbox' | 'num_finished',
  vqueueAlias: string,
) {
  const filtersSql = metadataFilterClauses(filters, 'vm');
  if (filtersSql.length === 0) return '';
  return `${vqueueAlias}.id IN (
          SELECT vm.id
          FROM sys_vqueue_meta vm
          WHERE ${filtersSql.join('\n            AND ')}
            AND vm.${counter} > 0
          LIMIT ${VQUEUE_SERVICE_QUEUE_LIMIT}
        )`;
}

/**
 * Returns granular global status summary buckets from stage-pruned VQueue scans and
 * service totals from metadata counters. When completed VQueue migration was
 * skipped, only the terminal branch uses invocation status.
 */
export async function queryInvocationSummaryFromVqueues(
  context: QueryContext,
  mode: ResolvedInvocationModeV2,
  completedVqueuesWereSkipped: boolean,
  filters: InvocationFilterV2[] = [],
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns' = 'all',
): Promise<InvocationSummaryQueryResult> {
  const includesStages = view !== 'breakdowns';
  const includesCompletedStage = view !== 'live-stages';
  const includesBreakdowns = view === 'all' || view === 'breakdowns';
  const liveActivity = [
    'vm.num_inbox > 0',
    'vm.num_running > 0',
    'vm.num_suspended > 0',
    'vm.num_paused > 0',
  ];
  const completeActivity = [...liveActivity, 'vm.num_finished > 0'];
  const metaQuery =
    completedVqueuesWereSkipped || !includesCompletedStage
      ? `
      SELECT
        vm.service_name,
        SUM(vm.num_inbox) AS inbox,
        SUM(vm.num_running) AS running,
        SUM(vm.num_suspended) AS suspended,
        SUM(vm.num_paused) AS paused
      FROM sys_vqueue_meta vm
      WHERE ${metadataWhere(filters, liveActivity, 'vm')}
      GROUP BY vm.service_name
    `.trim()
      : `
      SELECT
        vm.service_name,
        SUM(vm.num_inbox) AS inbox,
        SUM(vm.num_running) AS running,
        SUM(vm.num_suspended) AS suspended,
        SUM(vm.num_paused) AS paused,
        SUM(vm.num_finished) AS finished
      FROM sys_vqueue_meta vm
      WHERE ${metadataWhere(filters, completeActivity, 'vm')}
      GROUP BY vm.service_name
    `.trim();

  const sampledInboxQueueFilter = matchingQueueFilter(
    filters,
    'num_inbox',
    'sampled_inbox',
  );
  const sampledFinishedQueueFilter = matchingQueueFilter(
    filters,
    'num_finished',
    'sampled_finished',
  );
  const inboxQueueFilter = matchingQueueFilter(filters, 'num_inbox', 'v');
  const finishedQueueFilter = matchingQueueFilter(filters, 'num_finished', 'v');
  const finishedInvocationStatusClauses = [
    "ss.status = 'completed'",
    ...invocationStatusFilterClauses(filters, 'ss'),
  ];
  const sampledFinishedInvocationStatusClauses = invocationStatusFilterClauses(
    filters,
    'sampled_finished',
  );
  const sampledFinishedInvocationStatusColumns = invocationStatusSampleColumns(
    filters,
    undefined,
    ['target_service_name', 'completion_result'],
  );

  const inboxQuery =
    mode.type === 'sampled'
      ? `
      SELECT
        sampled_inbox.status,
        COUNT(1) AS count
      FROM (
        SELECT
          v.id,
          v.status
        FROM sys_vqueues v
        WHERE v.stage = 'inbox'
          AND v.entry_kind = 'invocation'
        LIMIT ${mode.sampleSize}
      ) sampled_inbox${
        sampledInboxQueueFilter
          ? `\n      WHERE ${sampledInboxQueueFilter}`
          : ''
      }
      GROUP BY sampled_inbox.status
    `.trim()
      : `
      SELECT
        v.status,
        COUNT(1) AS count
      FROM sys_vqueues v
      WHERE v.stage = 'inbox'
        AND v.entry_kind = 'invocation'${
          inboxQueueFilter ? `\n        AND ${inboxQueueFilter}` : ''
        }
      GROUP BY v.status
    `.trim();

  let finishedQuery: string;
  if (completedVqueuesWereSkipped && mode.type === 'sampled') {
    finishedQuery = `
      SELECT
        sampled_finished.target_service_name AS service_name,
        CASE
          WHEN sampled_finished.completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END AS status,
        COUNT(1) AS count
      FROM (
        SELECT
          ${sampledFinishedInvocationStatusColumns}
        FROM sys_invocation_status ss
        WHERE ss.status = 'completed'
        LIMIT ${mode.sampleSize}
      ) sampled_finished${
        sampledFinishedInvocationStatusClauses.length > 0
          ? `\n      WHERE ${sampledFinishedInvocationStatusClauses.join('\n        AND ')}`
          : ''
      }
      GROUP BY
        sampled_finished.target_service_name,
        CASE
          WHEN sampled_finished.completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END
    `.trim();
  } else if (completedVqueuesWereSkipped) {
    finishedQuery = `
      SELECT
        ss.target_service_name AS service_name,
        CASE
          WHEN ss.completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END AS status,
        COUNT(1) AS count
      FROM sys_invocation_status ss
      WHERE ${finishedInvocationStatusClauses.join('\n        AND ')}
      GROUP BY
        ss.target_service_name,
        CASE
          WHEN ss.completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END
    `.trim();
  } else if (mode.type === 'sampled') {
    finishedQuery = `
      SELECT
        sampled_finished.status,
        COUNT(1) AS count
      FROM (
        SELECT
          v.id,
          v.status
        FROM sys_vqueues v
        WHERE v.stage = 'finished'
          AND v.entry_kind = 'invocation'
        LIMIT ${mode.sampleSize}
      ) sampled_finished${
        sampledFinishedQueueFilter
          ? `\n      WHERE ${sampledFinishedQueueFilter}`
          : ''
      }
      GROUP BY sampled_finished.status
    `.trim();
  } else {
    finishedQuery = `
      SELECT
        v.status,
        COUNT(1) AS count
      FROM sys_vqueues v
      WHERE v.stage = 'finished'
        AND v.entry_kind = 'invocation'${
          finishedQueueFilter ? `\n        AND ${finishedQueueFilter}` : ''
        }
      GROUP BY v.status
    `.trim();
  }

  const [metaResult, inboxResult, finishedResult] = await Promise.all([
    includesStages
      ? (context.query(metaQuery) as Promise<{ rows: MetaRow[] }>)
      : Promise.resolve({ rows: [] as MetaRow[] }),
    includesBreakdowns
      ? (context.query(inboxQuery) as Promise<{ rows: StatusRow[] }>)
      : Promise.resolve({ rows: [] as StatusRow[] }),
    includesBreakdowns ||
    (completedVqueuesWereSkipped && includesStages && includesCompletedStage)
      ? (context.query(finishedQuery) as Promise<{ rows: StatusRow[] }>)
      : Promise.resolve({ rows: [] as StatusRow[] }),
  ]);

  const serviceStatusCounts = new Map<string, Map<string, number>>();
  let inboxPopulation = 0;
  let finishedPopulation = 0;
  let running = 0;
  let suspended = 0;
  let paused = 0;
  for (const row of metaResult.rows) {
    const inbox = Number(row.inbox ?? 0);
    const rowRunning = Number(row.running ?? 0);
    const rowSuspended = Number(row.suspended ?? 0);
    const rowPaused = Number(row.paused ?? 0);
    const finished = Number(row.finished ?? 0);
    inboxPopulation += inbox;
    running += rowRunning;
    suspended += rowSuspended;
    paused += rowPaused;
    finishedPopulation += finished;
    if (row.service_name) {
      serviceStatusCounts.set(
        row.service_name,
        new Map([
          ['inbox', inbox],
          ['running', rowRunning],
          ['suspended', rowSuspended],
          ['paused', rowPaused],
          ['finished', finished],
        ]),
      );
    }
  }

  if (completedVqueuesWereSkipped) {
    for (const row of finishedResult.rows) {
      if (!row.service_name) continue;
      const counts =
        serviceStatusCounts.get(row.service_name) ?? new Map<string, number>();
      counts.set(
        'finished',
        (counts.get('finished') ?? 0) + Number(row.count ?? 0),
      );
      serviceStatusCounts.set(row.service_name, counts);
    }
  }

  const inboxScanned = countRows(inboxResult.rows);
  const finishedScanned = countRows(finishedResult.rows);
  if (!includesStages) {
    inboxPopulation = inboxScanned;
    finishedPopulation = finishedScanned;
  }
  const queueSelectionIsBounded = filters.length > 0;
  const inboxIsPartial =
    includesBreakdowns &&
    (queueSelectionIsBounded ||
      (mode.type === 'sampled' && inboxScanned >= mode.sampleSize));
  const finishedIsPartial =
    (includesBreakdowns ||
      (completedVqueuesWereSkipped &&
        includesStages &&
        includesCompletedStage)) &&
    (queueSelectionIsBounded ||
      (mode.type === 'sampled' && finishedScanned >= mode.sampleSize));
  const inboxScale =
    includesStages && inboxIsPartial && inboxScanned > 0
      ? inboxPopulation / inboxScanned
      : 1;
  const finishedScale =
    includesStages &&
    !completedVqueuesWereSkipped &&
    finishedIsPartial &&
    finishedScanned > 0
      ? finishedPopulation / finishedScanned
      : 1;

  const statusCounts = new Map<InvocationStatus, number>([
    ['running', running],
    ['suspended', suspended],
    ['paused', paused],
  ]);
  for (const row of inboxResult.rows) {
    const status = getInvocationStatusFromVqueue({
      stage: 'inbox',
      status: row.status,
    });
    if (!status) continue;
    statusCounts.set(
      status,
      (statusCounts.get(status) ?? 0) +
        Math.round(Number(row.count ?? 0) * inboxScale),
    );
  }
  for (const row of finishedResult.rows) {
    const status = completedVqueuesWereSkipped
      ? (row.status as InvocationStatus | undefined)
      : getInvocationStatusFromVqueue({
          stage: 'finished',
          status: row.status,
        });
    if (!status) continue;
    statusCounts.set(
      status,
      (statusCounts.get(status) ?? 0) +
        Math.round(Number(row.count ?? 0) * finishedScale),
    );
  }

  const definitions = [
    ...LIVE_BUCKETS,
    ...(includesCompletedStage
      ? completedVqueuesWereSkipped
        ? GROUPED_TERMINAL_BUCKETS
        : TERMINAL_BUCKETS
      : []),
  ];

  return {
    stageBuckets: [
      {
        key: 'inbox',
        label: 'Inbox',
        statuses: getInvocationStatusesForStage('inbox'),
        count: inboxPopulation,
        breakdownIsPartial: inboxIsPartial,
        breakdownCoverage: includesBreakdowns ? 'full' : 'missing',
        breakdownCanRefine: !includesBreakdowns,
      },
      {
        key: 'running',
        label: 'Running',
        statuses: ['running'],
        count: running,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'suspended',
        label: 'Suspended',
        statuses: ['suspended'],
        count: suspended,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'paused',
        label: 'Paused',
        statuses: ['paused'],
        count: paused,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      ...(includesCompletedStage
        ? [
            {
              key: 'finished' as const,
              label: 'Completed',
              statuses: getInvocationStatusesForStage('finished'),
              count: completedVqueuesWereSkipped
                ? (statusCounts.get('succeeded') ?? 0) +
                  (statusCounts.get('failed') ?? 0)
                : finishedPopulation,
              breakdownIsPartial: finishedIsPartial,
              breakdownCoverage: completedVqueuesWereSkipped
                ? ('coarse' as const)
                : includesBreakdowns
                  ? ('full' as const)
                  : ('missing' as const),
              breakdownCanRefine:
                !completedVqueuesWereSkipped && !includesBreakdowns,
            },
          ]
        : []),
    ],
    stageCountsArePartial: includesStages
      ? includesCompletedStage &&
        completedVqueuesWereSkipped &&
        finishedIsPartial
      : inboxIsPartial || finishedIsPartial,
    statusBuckets: definitions.map((definition) => ({
      ...definition,
      count: statusCounts.get(definition.key as InvocationStatus) ?? 0,
    })),
    serviceBuckets: [...serviceStatusCounts]
      .map(([service, counts]) => {
        const statusBuckets = SERVICE_STAGE_BUCKETS.filter(
          (definition) =>
            includesCompletedStage || definition.key !== 'finished',
        ).map((definition) => ({
          ...definition,
          count: counts.get(definition.key) ?? 0,
        }));
        return {
          service,
          count: statusBuckets.reduce(
            (total, bucket) => total + bucket.count,
            0,
          ),
          statusBuckets,
        };
      })
      .sort((left, right) =>
        right.count !== left.count
          ? right.count - left.count
          : left.service.localeCompare(right.service),
      ),
    isPartial: inboxIsPartial || finishedIsPartial,
  };
}
