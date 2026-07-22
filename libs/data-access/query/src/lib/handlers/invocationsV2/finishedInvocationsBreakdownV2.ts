import type { components } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../shared';
import { badRequest, hasCompleteVqueueInvocationPopulation } from './shared';
import { queryFinishedBreakdownFromInvocationStatus } from './finished/queryFinishedBreakdownFromInvocationStatus';
import { queryFinishedBreakdownFromVqueues } from './finished/queryFinishedBreakdownFromVqueues';
import { resolveFinishedMode } from './finished/shared';

export type FinishedInvocationsBreakdownV2Args =
  components['schemas']['FinishedInvocationsBreakdownV2RequestBody'];

/**
 * Routes a validated completion breakdown to exact or bounded sampling and to
 * `sys_vqueues` or `sys_invocation_status` outcome granularity.
 */
export async function finishedInvocationsBreakdownV2(
  this: QueryContext,
  {
    mode: requestedMode,
    startTime,
    endTime,
  }: FinishedInvocationsBreakdownV2Args,
): Promise<Response> {
  const { mode, error } = resolveFinishedMode(requestedMode);
  if (error || !mode) return badRequest(error ?? 'Invalid mode');
  const useVqueues = hasCompleteVqueueInvocationPopulation(this);

  if (useVqueues) {
    return queryFinishedBreakdownFromVqueues(this, {
      mode,
      startTime,
      endTime,
    });
  }
  return queryFinishedBreakdownFromInvocationStatus(this, {
    mode,
    startTime,
    endTime,
  });
}
