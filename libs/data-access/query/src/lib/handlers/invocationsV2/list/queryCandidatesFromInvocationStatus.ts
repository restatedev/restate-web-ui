import type { QueryContext } from '../../shared';
import {
  INVOCATIONS_V2_LIMIT,
  type InvocationFilterV2,
  type InvocationSortV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import {
  invocationStatusColumnForField,
  invocationStatusWhere,
} from './invocationStatusFilters';
import { invocationStatusSampleColumns } from './invocationStatusPlan';

/**
 * Runs when VQueues are unavailable and every requested status and filter can
 * be resolved from sys_invocation_status without joining live state.
 */
export function queryCandidatesFromInvocationStatus(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
  includeInvocationDetails = false,
  limit = INVOCATIONS_V2_LIMIT,
) {
  const where = invocationStatusWhere(filters, 'ss', 'sis');
  const sortColumn = sort
    ? invocationStatusColumnForField(sort.field, 'ss')
    : undefined;
  const createdAtColumn =
    includeInvocationDetails && sort?.field === 'created_at'
      ? ',\n          ss.created_at AS created_at'
      : '';
  if (mode.type === 'sampled') {
    const sampleColumns = invocationStatusSampleColumns(filters, sort?.field);
    const suffix = `${where ? `\n        ${where}` : ''}${
      sort ? `\n        ORDER BY ${sortColumn} ${sort.order}` : ''
    }`;
    return context.query(
      `
        SELECT
          ss.id AS id${createdAtColumn}
        FROM (
          SELECT
            ${sampleColumns}
          FROM sys_invocation_status
          LIMIT ${mode.sampleSize}
        ) ss${suffix}
        LIMIT ${limit}
      `.trim(),
      'invocations-v2/candidates-from-status',
    );
  }

  const suffix = `${where ? `\n      ${where}` : ''}${
    sort ? `\n      ORDER BY ${sortColumn} ${sort.order}` : ''
  }`;
  return context.query(
    `
      SELECT
        ss.id AS id${createdAtColumn}
      FROM sys_invocation_status ss${suffix}
      LIMIT ${limit}
    `.trim(),
    'invocations-v2/candidates-from-status',
  );
}
