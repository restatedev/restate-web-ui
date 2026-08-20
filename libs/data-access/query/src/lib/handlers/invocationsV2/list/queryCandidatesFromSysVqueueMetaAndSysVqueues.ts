import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../../shared';
import { getInvocationListFieldOnTable } from '../invocationListFields';
import {
  filterToSql,
  INVOCATIONS_V2_LIMIT,
  type ResolvedInvocationModeV2,
  VQUEUE_SERVICE_QUEUE_LIMIT,
} from '../shared';
import type {
  InvocationCandidateRow,
  SysVqueueMetaAndVqueuesQueryPlan,
  VqueueListPartialResult,
} from './types';
import {
  vqueueColumnForSort,
  vqueueFilterClauses,
  vqueueMetadataCounterPredicate,
  vqueueSampleColumns,
  vqueueStagePredicate,
  vqueueStatusPredicate,
} from './vqueueFilters';

function metadataPredicates(query: SysVqueueMetaAndVqueuesQueryPlan) {
  const filters = (query.filters as FilterItem[]).flatMap((filter) => {
    const tableField = getInvocationListFieldOnTable(
      filter.field,
      'sys_vqueue_meta',
    );
    if (!tableField) return [];
    const clause = filterToSql(filter, `vm.${tableField.column}`);
    return clause ? [clause] : [];
  });
  return [
    ...filters,
    ...(query.statuses
      ? [vqueueMetadataCounterPredicate(query.statuses, 'vm')]
      : []),
  ];
}

/**
 * Runs when queue-level filters need sys_vqueue_meta for either the whole plan
 * or its live-status portion, while stages and statuses come from sys_vqueues.
 * It bounds matching queues before selecting their candidate entry IDs.
 */
export async function queryCandidatesFromSysVqueueMetaAndSysVqueues(
  context: QueryContext,
  query: SysVqueueMetaAndVqueuesQueryPlan,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
): Promise<{
  rows: InvocationCandidateRow[];
  partial?: VqueueListPartialResult;
}> {
  const queuePredicates = metadataPredicates(query);
  const statusPredicates = !query.statuses
    ? []
    : query.statuses.length === 0
      ? ['FALSE']
      : [
          vqueueStagePredicate(query.statuses, 'v'),
          vqueueStatusPredicate(query.statuses, 'v'),
        ];
  const entryPredicates = [
    "v.entry_kind = 'invocation'",
    ...statusPredicates,
    ...vqueueFilterClauses(query.filters, 'sys_vqueues', 'v'),
  ];
  const sortColumn = query.sort
    ? vqueueColumnForSort(query.sort.field, 'v')
    : undefined;
  const orderBy =
    query.sort && sortColumn
      ? `\n      ORDER BY ${sortColumn} ${query.sort.order} NULLS LAST`
      : '';
  const source =
    mode.type === 'sampled'
      ? `(\n          SELECT\n            ${['id', ...vqueueSampleColumns(query.filters, query.statuses, query.sort?.field)].join(',\n            ')}\n          FROM sys_vqueues\n          LIMIT ${mode.sampleSize}\n        ) v`
      : 'sys_vqueues v';

  const candidatesPromise = context.query(
    `
      SELECT
        v.entry_id AS id${
          includeInvocationDetails && query.sort?.field === 'created_at'
            ? ',\n        v.created_at AS created_at'
            : ''
        }
      FROM ${source}
      WHERE v.id IN (
        SELECT vm.id
        FROM sys_vqueue_meta vm
        WHERE ${queuePredicates.join('\n          AND ')}
        LIMIT ${VQUEUE_SERVICE_QUEUE_LIMIT}
      )
        AND ${entryPredicates.join('\n        AND ')}${orderBy}
      LIMIT ${INVOCATIONS_V2_LIMIT}
    `.trim(),
    'invocations-v2/candidates-from-vqueue-meta',
  ) as Promise<{ rows: InvocationCandidateRow[] }>;

  if (mode.type === 'sampled') return candidatesPromise;

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
    'invocations-v2/candidate-queue-count',
  ) as Promise<{ rows: Array<{ queue_count: number | string }> }>;

  const [candidates, queueCount] = await Promise.all([
    candidatesPromise,
    queueCountPromise,
  ]);
  const isPartial =
    Number(queueCount.rows[0]?.queue_count ?? 0) > VQUEUE_SERVICE_QUEUE_LIMIT;

  return {
    rows: candidates.rows,
    ...(isPartial && {
      partial: {
        reason: 'vqueue-limit' as const,
        queueLimit: VQUEUE_SERVICE_QUEUE_LIMIT,
      },
    }),
  };
}
