import type { QueryContext } from '../../shared';
import { INVOCATIONS_V2_LIMIT } from '../shared';
import type { InvocationStateStatus } from './invocationStatusPlan';

/**
 * Runs when VQueues are unavailable and an unsorted status-only request selects
 * running, backing-off, or both. sys_invocation_state contains only those two
 * states, so this path avoids scanning the full invocation-status population.
 */
export function queryRunningOrBackingOffCandidatesFromInvocationState(
  context: QueryContext,
  statuses: InvocationStateStatus[],
  limit = INVOCATIONS_V2_LIMIT,
) {
  const statusFilter =
    statuses.length === 2
      ? ''
      : statuses[0] === 'running'
        ? '\n      WHERE in_flight IS TRUE'
        : '\n      WHERE in_flight IS NOT TRUE';

  return context.query(
    `
      SELECT id
      FROM sys_invocation_state${statusFilter}
      LIMIT ${limit}
    `.trim(),
    'invocations-v2/candidates-from-state',
  );
}
