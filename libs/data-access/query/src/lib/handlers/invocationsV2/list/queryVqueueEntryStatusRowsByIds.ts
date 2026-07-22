import type { QueryContext } from '../../shared';
import { getInvocationListFieldOnTable } from '../invocationListFields';
import {
  sqlStringList,
  type InvocationFilterV2,
  type InvocationSortV2,
} from '../shared';
import { vqueueFilterClauses } from './vqueueFilters';

/**
 * Runs beside invocation hydration for a bounded VQueue candidate set. It
 * loads the optional overlay and supplies exact statuses for candidates that
 * require VQueue refinement.
 */
export function queryVqueueEntryStatusRowsByIds(
  context: QueryContext,
  ids: string[],
  filters: InvocationFilterV2[],
  sort?: InvocationSortV2,
) {
  const clauses = [
    `v.entry_id IN (${sqlStringList(ids)})`,
    "v.entry_kind = 'invocation'",
    ...vqueueFilterClauses(filters, 'sys_vqueue_entry_status', 'v'),
  ];
  const sortColumn = sort
    ? getInvocationListFieldOnTable(sort.field, 'sys_vqueue_entry_status')
        ?.column
    : undefined;
  const orderBy =
    sort && sortColumn
      ? `\n      ORDER BY v.${sortColumn} ${sort.order} NULLS LAST`
      : '';
  return context.query(
    `
      SELECT
        v.entry_id,
        v.vqueue_id,
        v.stage,
        v.status,
        v.next_at,
        v.created_at,
        v.transitioned_at,
        v.first_attempt_at,
        v.latest_attempt_at,
        v.first_runnable_at,
        v.retry_attempts,
        v.retry_count_since_last_stored_command,
        v.num_attempts,
        v.num_errors,
        v.deployment
      FROM sys_vqueue_entry_status v
      WHERE ${clauses.join('\n        AND ')}${orderBy}
    `.trim(),
  );
}
