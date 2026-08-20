import type { QueryContext } from '../../shared';
import { INVOCATION_LIST_FIELDS } from '../invocationListFields';
import { INVOCATIONS_V2_LIMIT, type ResolvedInvocationModeV2 } from '../shared';
import {
  invocationStatusColumnForField,
  invocationStatusColumnName,
  invocationStatusFilterClauses,
  invocationStatusPredicate,
} from './invocationStatusFilters';
import type {
  InvocationCandidateRow,
  SysInvocationStatusQueryPlan,
} from './types';

function columnsNeededFromSample(query: SysInvocationStatusQueryPlan) {
  const statusField =
    INVOCATION_LIST_FIELDS.status.tables.sys_invocation_status;
  const columns = new Set(['id']);
  for (const filter of query.filters) {
    columns.add(invocationStatusColumnName(filter.field));
  }
  if (query.statuses?.length) columns.add(statusField.column);
  if (
    query.statuses?.some((status) =>
      ['succeeded', 'failed', 'cancelled', 'killed'].includes(status),
    )
  ) {
    columns.add(statusField.supportingColumns.completionResult);
  }
  if (
    query.statuses?.some((status) =>
      ['failed', 'cancelled', 'killed'].includes(status),
    )
  ) {
    columns.add(statusField.supportingColumns.completionFailure);
  }
  if (query.sort) {
    columns.add(invocationStatusColumnName(query.sort.field));
  }
  return [...columns];
}

/**
 * Runs when the VQueue planner selects sys_invocation_status as either the
 * complete candidate source or the terminal-status half of a merged plan. It
 * handles only statuses this table can resolve exactly.
 */
export function queryCandidatesFromSysInvocationStatus(
  context: QueryContext,
  query: SysInvocationStatusQueryPlan,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
  limit = INVOCATIONS_V2_LIMIT,
) {
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
      ? `(\n          SELECT\n            ${columnsNeededFromSample(query).join(',\n            ')}\n          FROM sys_invocation_status\n          LIMIT ${mode.sampleSize}\n        ) ss`
      : 'sys_invocation_status ss';

  return context.query(
    `
      SELECT
        ss.id AS id${
          includeInvocationDetails && query.sort?.field === 'created_at'
            ? ',\n        ss.created_at AS created_at'
            : ''
        }
      FROM ${source}${where}${orderBy}
      LIMIT ${limit}
    `.trim(),
    'invocations-v2/candidates-from-status-planned',
  ) as Promise<{ rows: InvocationCandidateRow[] }>;
}
