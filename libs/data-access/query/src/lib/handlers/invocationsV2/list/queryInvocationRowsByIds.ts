import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { getSysInvocationListColumns, type QueryContext } from '../../shared';
import { getInvocationListFieldOnTable } from '../invocationListFields';
import {
  type InvocationFilterV2,
  type InvocationSortV2,
  sqlStringList,
} from '../shared';
import {
  fieldFilterClause,
  statusFilterClause,
} from './invocationStatusFilters';

/**
 * Runs after any candidate source, or directly for ID filters, to load complete
 * invocation rows. It revalidates invocation-owned filters while loading at
 * most 500 IDs through point lookups from sys_invocation.
 */
export function queryInvocationRowsByIds(
  context: QueryContext,
  ids: string[],
  filters: InvocationFilterV2[],
  sort?: InvocationSortV2,
) {
  const columns = getSysInvocationListColumns(context.features).join(',\n');
  const source = { type: 'invocation', alias: 'i' } as const;
  const clauses = (filters as FilterItem[])
    .filter((filter) => filter.field !== 'id')
    .map((filter) =>
      filter.field === 'status'
        ? statusFilterClause(filter, source)
        : fieldFilterClause(filter, source),
    )
    .filter((clause): clause is string => Boolean(clause));
  const filterClauses = clauses.length
    ? `\n        AND ${clauses.join('\n        AND ')}`
    : '';
  const sortColumn = sort
    ? getInvocationListFieldOnTable(sort.field, 'sys_invocation')?.column
    : undefined;
  const orderBy =
    sort && sortColumn
      ? `\n      ORDER BY i.${sortColumn} ${sort.order} NULLS LAST`
      : '';

  return context.query(
    `
      SELECT
        ${columns}
      FROM sys_invocation i
      WHERE i.id IN (${sqlStringList(ids)})${filterClauses}${orderBy}
    `.trim(),
    'invocations-v2/rows-by-ids',
  );
}
