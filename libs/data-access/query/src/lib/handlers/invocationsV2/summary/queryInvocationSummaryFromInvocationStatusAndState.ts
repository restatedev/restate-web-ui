import {
  getInvocationStatusesForStage,
  INVOCATION_STATUS_DEFINITIONS,
} from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../../shared';
import type { InvocationStatus } from '../../../invocationStatuses';
import {
  supportsInvocationV2Vqueues,
  type InvocationFilterV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import { invocationStatusFilterClauses } from '../list/invocationStatusFilters';
import { invocationStatusSampleColumns } from '../list/invocationStatusPlan';
import type {
  InvocationStatusSummaryBucket,
  InvocationSummaryQueryResult,
} from './types';

type SummaryRow = {
  service_name?: string;
  bucket?: string;
  count?: number | string;
};

function statusExpression(
  statusAlias: string,
  stateAlias: string,
  includesYielded: boolean,
) {
  return `CASE
          WHEN ${statusAlias}.status = 'inboxed' THEN 'pending'
          WHEN ${statusAlias}.status = 'invoked' AND ${stateAlias}.in_flight IS TRUE THEN 'running'
${
  includesYielded
    ? `          WHEN ${statusAlias}.status = 'invoked' THEN 'ready-yielded-backing-off'`
    : `          WHEN ${statusAlias}.status = 'invoked' AND ${stateAlias}.retry_count > 0 THEN 'backing-off'
          WHEN ${statusAlias}.status = 'invoked' THEN 'ready'`
}
          WHEN ${statusAlias}.status = 'completed' AND ${statusAlias}.completion_result = 'success' THEN 'succeeded'
          WHEN ${statusAlias}.status = 'completed' THEN 'failed'
          ELSE ${statusAlias}.status
        END`;
}

/**
 * Returns filtered status and per-service summary buckets. Invocation status supplies
 * the durable population and filters; invocation state separates invoker-owned
 * running attempts from the remaining ready, yielded, or backing-off rows.
 */
export async function queryInvocationSummaryFromInvocationStatusAndState(
  context: QueryContext,
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
): Promise<InvocationSummaryQueryResult> {
  const exactClauses = invocationStatusFilterClauses(filters, 'ss');
  const exactWhere = exactClauses.length
    ? `\n      WHERE ${exactClauses.join('\n        AND ')}`
    : '';
  const sampledClauses = invocationStatusFilterClauses(
    filters,
    'sampled_invocations',
  );
  const sampledWhere = sampledClauses.length
    ? `\n        WHERE ${sampledClauses.join('\n          AND ')}`
    : '';
  const includesYielded = supportsInvocationV2Vqueues(context);
  const exactStatus = statusExpression('ss', 'sis', includesYielded);
  const sampledStatus = statusExpression(
    'sampled_invocations',
    'sis',
    includesYielded,
  );
  const sampledColumns = invocationStatusSampleColumns(filters, undefined, [
    'id',
    'target_service_name',
    'status',
    'completion_result',
  ]);

  const query =
    mode.type === 'sampled'
      ? `
      SELECT
        sampled_invocations.target_service_name AS service_name,
        ${sampledStatus} AS bucket,
        COUNT(1) AS count
      FROM (
        SELECT
          ${sampledColumns}
        FROM sys_invocation_status
        LIMIT ${mode.sampleSize}
      ) sampled_invocations
      LEFT JOIN sys_invocation_state sis ON sis.id = sampled_invocations.id${sampledWhere}
      GROUP BY
        sampled_invocations.target_service_name,
        ${sampledStatus}
    `.trim()
      : `
      SELECT
        ss.target_service_name AS service_name,
        ${exactStatus} AS bucket,
        COUNT(1) AS count
      FROM sys_invocation_status ss
      LEFT JOIN sys_invocation_state sis ON sis.id = ss.id${exactWhere}
      GROUP BY
        ss.target_service_name,
        ${exactStatus}
    `.trim();

  const { rows } = (await context.query(
    query,
    'invocations-v2/summary-from-status-and-state',
  )) as { rows: SummaryRow[] };
  const waitingStatuses: InvocationStatus[] = [
    'ready',
    ...(includesYielded ? (['yielded'] as const) : []),
    'backing-off',
  ];
  const statusDefinitions = Object.fromEntries(
    INVOCATION_STATUS_DEFINITIONS.map(({ key, label }) => [
      key,
      { key, label, statuses: [key] },
    ]),
  ) as Record<InvocationStatus, Omit<InvocationStatusSummaryBucket, 'count'>>;
  const waitingDefinitions: Omit<InvocationStatusSummaryBucket, 'count'>[] =
    includesYielded
      ? [
          {
            key: 'ready-yielded-backing-off',
            label: 'Ready, yielded or backing off',
            statuses: waitingStatuses,
          },
        ]
      : [statusDefinitions.ready, statusDefinitions['backing-off']];
  const definitions: Omit<InvocationStatusSummaryBucket, 'count'>[] = [
    ...(['scheduled', 'pending'] as const).map(
      (status) => statusDefinitions[status],
    ),
    ...waitingDefinitions,
    ...(['running', 'suspended', 'paused', 'succeeded'] as const).map(
      (status) => statusDefinitions[status],
    ),
    {
      key: 'failed',
      label: 'Failed, cancelled or killed',
      statuses: ['failed', 'cancelled', 'killed'],
    },
  ];

  const statusCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const serviceStatusCounts = new Map<string, Map<string, number>>();
  let scannedCount = 0;
  for (const row of rows) {
    const count = Number(row.count ?? 0);
    scannedCount += count;
    if (row.bucket) {
      statusCounts.set(row.bucket, (statusCounts.get(row.bucket) ?? 0) + count);
    }
    if (row.service_name) {
      serviceCounts.set(
        row.service_name,
        (serviceCounts.get(row.service_name) ?? 0) + count,
      );
      if (row.bucket) {
        const counts =
          serviceStatusCounts.get(row.service_name) ??
          new Map<string, number>();
        counts.set(row.bucket, (counts.get(row.bucket) ?? 0) + count);
        serviceStatusCounts.set(row.service_name, counts);
      }
    }
  }
  const isPartial =
    mode.type === 'sampled' &&
    (filters.length > 0 || scannedCount >= mode.sampleSize);
  const waitingCount = includesYielded
    ? (statusCounts.get('ready-yielded-backing-off') ?? 0)
    : (statusCounts.get('ready') ?? 0) + (statusCounts.get('backing-off') ?? 0);

  return {
    stageBuckets: [
      {
        key: 'inbox',
        label: 'Inbox',
        statuses: [
          'pending',
          'scheduled',
          'ready',
          ...(includesYielded ? (['yielded'] as const) : []),
          'backing-off',
        ],
        count:
          (statusCounts.get('pending') ?? 0) +
          (statusCounts.get('scheduled') ?? 0) +
          waitingCount,
        breakdownIsPartial: isPartial,
        breakdownCoverage: includesYielded ? 'coarse' : 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'running',
        label: 'Running',
        statuses: ['running'],
        count: statusCounts.get('running') ?? 0,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'suspended',
        label: 'Suspended',
        statuses: ['suspended'],
        count: statusCounts.get('suspended') ?? 0,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'paused',
        label: 'Paused',
        statuses: ['paused'],
        count: statusCounts.get('paused') ?? 0,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
      {
        key: 'finished',
        label: 'Completed',
        statuses: getInvocationStatusesForStage('finished'),
        count:
          (statusCounts.get('succeeded') ?? 0) +
          (statusCounts.get('failed') ?? 0),
        breakdownIsPartial: isPartial,
        breakdownCoverage: 'coarse',
        breakdownCanRefine: false,
      },
    ],
    stageCountsArePartial: isPartial,
    statusBuckets: definitions.map((definition) => ({
      ...definition,
      count: statusCounts.get(definition.key) ?? 0,
    })),
    serviceBuckets: [...serviceCounts]
      .map(([service, count]) => ({
        service,
        count,
        statusBuckets: definitions.map((definition) => ({
          ...definition,
          count: serviceStatusCounts.get(service)?.get(definition.key) ?? 0,
        })),
      }))
      .sort((left, right) =>
        right.count !== left.count
          ? right.count - left.count
          : left.service.localeCompare(right.service),
      ),
    isPartial,
  };
}
