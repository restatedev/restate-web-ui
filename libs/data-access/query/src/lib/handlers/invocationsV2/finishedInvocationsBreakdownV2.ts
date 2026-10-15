import type { components } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../shared';
import { badRequest } from './shared';
import { queryFinishedBreakdownFromVqueues } from './finished/queryFinishedBreakdownFromVqueues';
import { resolveFinishedMode } from './finished/shared';

export type FinishedInvocationsBreakdownV2Args =
  components['schemas']['FinishedInvocationsBreakdownV2RequestBody'];

/**
 * Routes a validated completion breakdown to exact or bounded sampling over
 * `sys_vqueues`.
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
  return queryFinishedBreakdownFromVqueues(this, {
    mode,
    startTime,
    endTime,
  });
}
