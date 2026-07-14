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
 * Runs when VQueues are unavailable and a requested running, backing-off, or
 * ready predicate requires sys_invocation_state alongside invocation status.
 */
export function queryCandidatesFromInvocationStatusAndState(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
) {
  const where = invocationStatusWhere(filters, 'ss', 'sis');
  const sortColumn = sort
    ? invocationStatusColumnForField(sort.field, 'ss')
    : undefined;
  if (mode.type === 'sampled') {
    const sampleColumns = invocationStatusSampleColumns(filters, sort?.field);
    const suffix = `${where ? `\n        ${where}` : ''}${
      sort ? `\n        ORDER BY ${sortColumn} ${sort.order}` : ''
    }`;
    return context.query(
      `
        SELECT
          ss.id AS id
        FROM (
          SELECT
            ${sampleColumns}
          FROM sys_invocation_status
          LIMIT ${mode.sampleSize}
        ) ss
        LEFT JOIN (
          SELECT
            id AS state_id,
            in_flight,
            retry_count
          FROM sys_invocation_state
        ) sis
          ON sis.state_id = ss.id${suffix}
        LIMIT ${INVOCATIONS_V2_LIMIT}
      `.trim(),
    );
  }

  const suffix = `${where ? `\n      ${where}` : ''}${
    sort ? `\n      ORDER BY ${sortColumn} ${sort.order}` : ''
  }`;
  return context.query(
    `
      SELECT
        ss.id AS id
      FROM sys_invocation_status ss
      LEFT JOIN (
        SELECT
          id AS state_id,
          in_flight,
          retry_count
        FROM sys_invocation_state
      ) sis
        ON sis.state_id = ss.id${suffix}
      LIMIT ${INVOCATIONS_V2_LIMIT}
    `.trim(),
  );
}
