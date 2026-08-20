import { TERMINAL_INVOCATION_STATUSES } from '../../../invocationStatuses';
import type { QueryContext } from '../../shared';
import {
  supportsInvocationV2Vqueues,
  type InvocationFilterV2,
  type ResolvedInvocationModeV2,
  VQUEUE_SERVICE_QUEUE_LIMIT,
} from '../shared';
import { createVqueueListQueryPlan } from '../list/createVqueueListQueryPlan';
import { createQueryPlanWhenCompletedVqueuesWereSkipped } from '../list/createQueryPlanWhenCompletedVqueuesWereSkipped';
import { sourcePlansToExecute } from '../list/selectVqueueInvocationCandidates';
import type {
  ExecutableInvocationCandidateSourcePlan,
  SysInvocationStatusQueryPlan,
  SysVqueueMetaAndVqueuesQueryPlan,
  SysVqueuesQueryPlan,
} from '../list/types';
import {
  invocationStatusFilterClauses,
  invocationStatusPredicate,
} from '../list/invocationStatusFilters';
import { invocationStatusSampleColumns } from '../list/invocationStatusPlan';
import {
  vqueueFilterClauses,
  vqueueMetadataPredicates,
  vqueueSampleColumns,
  vqueueStatusPredicate,
} from '../list/vqueueFilters';
import { queryInvocationCountFromInvocationStatusAndState } from './queryInvocationSummaryFromInvocationStatusAndState';

type CountRow = {
  count?: number | string;
  queue_count?: number | string;
};

type InvocationCountResult = {
  count: number;
  isPartial: boolean;
};

type CountableSourcePlan = Exclude<
  ExecutableInvocationCandidateSourcePlan,
  { source: 'best_effort_sys_invocation_status' }
>;

function vqueueStatusPredicates(
  statuses: SysVqueuesQueryPlan['statuses'],
  alias: string,
) {
  if (!statuses) return [];
  if (statuses.length === 0) return ['FALSE'];
  return [vqueueStatusPredicate(statuses, alias)];
}

async function queryCountFromSysVqueues(
  context: QueryContext,
  query: SysVqueuesQueryPlan,
  mode: ResolvedInvocationModeV2,
): Promise<InvocationCountResult> {
  const clauses = [
    "v.entry_kind = 'invocation'",
    ...vqueueStatusPredicates(query.statuses, 'v'),
    ...vqueueFilterClauses(query.filters, 'sys_vqueues', 'v'),
  ];
  const source =
    mode.type === 'sampled'
      ? `(\n        SELECT\n          ${vqueueSampleColumns(query.filters, query.statuses, undefined, ['entry_kind']).join(',\n          ')}\n        FROM sys_vqueues\n        LIMIT ${mode.sampleSize}\n      ) v`
      : 'sys_vqueues v';
  const { rows } = (await context.query(
    `
      SELECT
        COUNT(1) AS count
      FROM ${source}
      WHERE ${clauses.join('\n        AND ')}
    `.trim(),
    'invocations-v2/count-from-vqueues',
  )) as { rows: CountRow[] };
  return {
    count: Number(rows[0]?.count ?? 0),
    isPartial: mode.type === 'sampled',
  };
}

async function queryCountFromSysVqueueMetaAndSysVqueues(
  context: QueryContext,
  query: SysVqueueMetaAndVqueuesQueryPlan,
  mode: ResolvedInvocationModeV2,
): Promise<InvocationCountResult> {
  const queuePredicates = vqueueMetadataPredicates(
    query.filters,
    query.statuses,
    'vm',
  );
  const entryPredicates = [
    "v.entry_kind = 'invocation'",
    ...vqueueStatusPredicates(query.statuses, 'v'),
    ...vqueueFilterClauses(query.filters, 'sys_vqueues', 'v'),
  ];
  const source =
    mode.type === 'sampled'
      ? `(\n        SELECT\n          ${vqueueSampleColumns(query.filters, query.statuses, undefined, ['id', 'entry_kind']).join(',\n          ')}\n        FROM sys_vqueues\n        LIMIT ${mode.sampleSize}\n      ) v`
      : 'sys_vqueues v';
  const countPromise = context.query(
    `
      SELECT
        COUNT(1) AS count
      FROM ${source}
      WHERE v.id IN (
        SELECT vm.id
        FROM sys_vqueue_meta vm
        WHERE ${queuePredicates.join('\n          AND ')}
        LIMIT ${VQUEUE_SERVICE_QUEUE_LIMIT}
      )
        AND ${entryPredicates.join('\n        AND ')}
    `.trim(),
    'invocations-v2/count-from-vqueue-meta',
  ) as Promise<{ rows: CountRow[] }>;
  if (mode.type === 'sampled') {
    const { rows } = await countPromise;
    return { count: Number(rows[0]?.count ?? 0), isPartial: true };
  }

  const queueCountPromise = context.query(
    `
      SELECT
        COUNT(1) AS queue_count
      FROM (
        SELECT vm.id
        FROM sys_vqueue_meta vm
        WHERE ${queuePredicates.join('\n          AND ')}
        LIMIT ${VQUEUE_SERVICE_QUEUE_LIMIT + 1}
      ) limited_service_queues
    `.trim(),
    'invocations-v2/count-vqueue-meta-queues',
  ) as Promise<{ rows: CountRow[] }>;
  const [count, queueCount] = await Promise.all([
    countPromise,
    queueCountPromise,
  ]);
  return {
    count: Number(count.rows[0]?.count ?? 0),
    isPartial:
      Number(queueCount.rows[0]?.queue_count ?? 0) > VQUEUE_SERVICE_QUEUE_LIMIT,
  };
}

function invocationStatusRequiredColumns(query: SysInvocationStatusQueryPlan) {
  const columns = ['id'];
  if (query.statuses === undefined) return columns;
  columns.push('status');
  if (
    query.statuses.some((status) =>
      TERMINAL_INVOCATION_STATUSES.includes(status),
    )
  ) {
    columns.push('completion_result');
  }
  if (
    query.statuses.some((status) =>
      ['failed', 'cancelled', 'killed'].includes(status),
    )
  ) {
    columns.push('completion_failure');
  }
  return columns;
}

async function queryCountFromSysInvocationStatus(
  context: QueryContext,
  query: SysInvocationStatusQueryPlan,
  mode: ResolvedInvocationModeV2,
): Promise<InvocationCountResult> {
  const statusPredicate =
    query.statuses === undefined
      ? undefined
      : query.statuses.length === 0
        ? 'FALSE'
        : invocationStatusPredicate(query.statuses, 'ss');
  const clauses = [
    statusPredicate,
    ...invocationStatusFilterClauses(query.filters, 'ss'),
  ].filter((clause): clause is string => Boolean(clause));
  const where = clauses.length
    ? `\n      WHERE ${clauses.join('\n        AND ')}`
    : '';
  const source =
    mode.type === 'sampled'
      ? `(\n        SELECT\n          ${invocationStatusSampleColumns(query.filters, undefined, invocationStatusRequiredColumns(query))}\n        FROM sys_invocation_status\n        LIMIT ${mode.sampleSize}\n      ) ss`
      : 'sys_invocation_status ss';
  const { rows } = (await context.query(
    `
      SELECT
        COUNT(1) AS count
      FROM ${source}${where}
    `.trim(),
    'invocations-v2/count-from-status-planned',
  )) as { rows: CountRow[] };
  return {
    count: Number(rows[0]?.count ?? 0),
    isPartial: mode.type === 'sampled',
  };
}

function queryCountFromSourcePlan(
  context: QueryContext,
  query: CountableSourcePlan,
  mode: ResolvedInvocationModeV2,
) {
  switch (query.source) {
    case 'sys_vqueues':
      return queryCountFromSysVqueues(context, query, mode);
    case 'sys_vqueue_meta_and_sys_vqueues':
      return queryCountFromSysVqueueMetaAndSysVqueues(context, query, mode);
    case 'sys_invocation_status':
      return queryCountFromSysInvocationStatus(context, query, mode);
  }
}

export async function queryInvocationCountV2(
  context: QueryContext,
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
): Promise<InvocationCountResult | { error: string }> {
  if (
    !supportsInvocationV2Vqueues(context) ||
    filters.some(({ field }) => field === 'id')
  ) {
    return queryInvocationCountFromInvocationStatusAndState(
      context,
      filters,
      mode,
    );
  }

  const queryPlan = context.features.has('vqueues_migration_skip_completed')
    ? createQueryPlanWhenCompletedVqueuesWereSkipped(
        context,
        filters,
        undefined,
      )
    : createVqueueListQueryPlan(context, filters, undefined);
  if (queryPlan.error) return { error: queryPlan.error };
  const selected = sourcePlansToExecute(queryPlan, undefined);
  if ('error' in selected) return selected;
  const countableSourcePlans = selected.sourcePlans.filter(
    (sourcePlan): sourcePlan is CountableSourcePlan =>
      sourcePlan.source !== 'best_effort_sys_invocation_status',
  );
  if (countableSourcePlans.length !== selected.sourcePlans.length) {
    return queryInvocationCountFromInvocationStatusAndState(
      context,
      filters,
      mode,
    );
  }

  const results = await Promise.all(
    countableSourcePlans.map((sourcePlan) =>
      queryCountFromSourcePlan(context, sourcePlan, mode),
    ),
  );
  return {
    count: results.reduce((total, result) => total + result.count, 0),
    isPartial: results.some(({ isPartial }) => isPartial),
  };
}
