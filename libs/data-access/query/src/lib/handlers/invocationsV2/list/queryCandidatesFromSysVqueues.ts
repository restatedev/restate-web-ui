import type { QueryContext } from '../../shared';
import { INVOCATIONS_V2_LIMIT, type ResolvedInvocationModeV2 } from '../shared';
import type { InvocationCandidateRow, SysVqueuesQueryPlan } from './types';
import {
  vqueueColumnForSort,
  vqueueFilterClauses,
  vqueueSampleColumns,
  vqueueStagePredicate,
  vqueueStatusPredicate,
} from './vqueueFilters';

/**
 * Runs when sys_vqueues can apply the requested criteria for either the whole
 * plan or its live-status portion. It is the executor's preferred complete
 * candidate source.
 */
export function queryCandidatesFromSysVqueues(
  context: QueryContext,
  query: SysVqueuesQueryPlan,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
) {
  const statusPredicates = !query.statuses
    ? []
    : query.statuses.length === 0
      ? ['FALSE']
      : [
          vqueueStagePredicate(query.statuses, 'v'),
          vqueueStatusPredicate(query.statuses, 'v'),
        ];
  const clauses = [
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
      ? `(\n          SELECT\n            ${vqueueSampleColumns(query.filters, query.statuses, query.sort?.field).join(',\n            ')}\n          FROM sys_vqueues\n          LIMIT ${mode.sampleSize}\n        ) v`
      : 'sys_vqueues v';

  return context.query(
    `
      SELECT
        v.entry_id AS id${
          includeInvocationDetails && query.sort?.field === 'created_at'
            ? ',\n        v.created_at AS created_at'
            : ''
        }
      FROM ${source}
      WHERE ${clauses.join('\n        AND ')}${orderBy}
      LIMIT ${INVOCATIONS_V2_LIMIT}
    `.trim(),
    'invocations-v2/candidates-from-vqueues',
  ) as Promise<{ rows: InvocationCandidateRow[] }>;
}
