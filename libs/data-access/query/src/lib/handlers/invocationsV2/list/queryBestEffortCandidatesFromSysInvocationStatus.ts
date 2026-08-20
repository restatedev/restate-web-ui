import { INVOCATION_STATUS_DEFINITIONS } from '../../../invocationStatuses';
import {
  BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT,
  type QueryContext,
} from '../../shared';
import { INVOCATION_LIST_FIELDS } from '../invocationListFields';
import { sqlStringList, type ResolvedInvocationModeV2 } from '../shared';
import {
  invocationStatusColumnForField,
  invocationStatusColumnName,
  invocationStatusFilterClauses,
} from './invocationStatusFilters';
import type {
  BestEffortSysInvocationStatusQueryPlan,
  InvocationCandidateRow,
} from './types';

function storedStatusPredicate(query: BestEffortSysInvocationStatusQueryPlan) {
  const storedStatuses = query.statuses.map(
    (status) => INVOCATION_STATUS_DEFINITIONS[status].sysInvocationStatus,
  );
  if (storedStatuses.some((status) => status === undefined)) return undefined;
  return `ss.status IN (${sqlStringList([
    ...new Set(storedStatuses as string[]),
  ])})`;
}

function columnsNeededFromSample(
  query: BestEffortSysInvocationStatusQueryPlan,
  includeInvocationDetails: boolean,
) {
  const statusField =
    INVOCATION_LIST_FIELDS.status.tables.sys_invocation_status;
  const columns = new Set(['id', statusField.column]);
  if (includeInvocationDetails) {
    columns.add(statusField.supportingColumns.completionResult);
    columns.add(statusField.supportingColumns.completionFailure);
  }
  for (const filter of query.filters) {
    columns.add(invocationStatusColumnName(filter.field));
  }
  if (query.sort) {
    columns.add(invocationStatusColumnName(query.sort.field));
  }
  return [...columns];
}

/**
 * Runs when VQueues own a requested live status, but invocation-status-owned
 * filters or sorting prevent a complete VQueue source plan. It selects bounded
 * coarse candidates; common hydration then resolves and rechecks their exact
 * statuses through sys_vqueue_entry_status point lookups.
 */
export function queryBestEffortCandidatesFromSysInvocationStatus(
  context: QueryContext,
  query: BestEffortSysInvocationStatusQueryPlan,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
  limit = BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT,
) {
  const clauses = [
    storedStatusPredicate(query),
    ...invocationStatusFilterClauses(query.filters, 'ss'),
  ].filter((clause): clause is string => Boolean(clause));
  const sortColumn = query.sort
    ? invocationStatusColumnForField(query.sort.field, 'ss')
    : undefined;
  const where = clauses.length
    ? `\n      WHERE ${clauses.join('\n        AND ')}`
    : '';
  const orderBy = query.sort
    ? `\n      ORDER BY ${sortColumn} ${query.sort.order} NULLS LAST`
    : '';
  const source =
    mode.type === 'sampled'
      ? `(\n          SELECT\n            ${columnsNeededFromSample(query, includeInvocationDetails).join(',\n            ')}\n          FROM sys_invocation_status\n          LIMIT ${mode.sampleSize}\n        ) ss`
      : 'sys_invocation_status ss';

  return context.query(
    `
      SELECT
        ss.id AS id${
          includeInvocationDetails && query.sort?.field === 'created_at'
            ? ',\n        ss.created_at AS created_at'
            : ''
        }${
          includeInvocationDetails
            ? ',\n        ss.status AS raw_status,\n        ss.completion_result,\n        ss.completion_failure'
            : ''
        }
      FROM ${source}${where}${orderBy}
      LIMIT ${limit}
    `.trim(),
    'invocations-v2/best-effort-candidates',
  ) as Promise<{ rows: InvocationCandidateRow[] }>;
}
