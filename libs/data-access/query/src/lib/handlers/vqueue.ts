import type { VqueueStatus } from '../convertInvocation';
import { type QueryContext, quoteSqlString } from './shared';

// Temporary, local-only flag persisted to localStorage and flipped via the
// /feature-flags/FEATURE_VQUEUE_STATUS route. Read directly here: the query
// layer sits below @restate/util/feature-flag in the dependency graph, so
// importing that lib would create a cycle.
// const VQUEUE_STATUS_FLAG = 'FEATURE_VQUEUE_STATUS';

function vqueueStatusFlagEnabled(): boolean {
  return true;
  // return (
  //   typeof localStorage !== 'undefined' &&
  //   localStorage.getItem(VQUEUE_STATUS_FLAG) === 'true'
  // );
}

// Looks up the live vqueue state for one invocation's entry. Runs no query —
// and returns undefined — when the flag is off or no `vqueueId` is known.
// Keyed by both the queue (`id`) and the invocation (`entry_id`): a stale
// `vqueueId` (the entry has since moved queues) therefore returns nothing, so
// callers can retry with the invocation's current vqueue_id.
export async function fetchVqueueStatus(
  ctx: QueryContext,
  invocationId: string,
  vqueueId?: string,
): Promise<VqueueStatus | undefined> {
  if (!vqueueId || !invocationId || !vqueueStatusFlagEnabled()) {
    return undefined;
  }

  const { rows } = await ctx.query(
    `SELECT status, run_at, num_attempts, latest_attempt_at FROM sys_vqueues WHERE id = ${quoteSqlString(vqueueId)} AND entry_id = ${quoteSqlString(invocationId)}`,
  );
  const row = rows.at(0);
  return row
    ? {
        status: row.status as string,
        run_at: row.run_at as string,
        num_attempts: row.num_attempts as number,
        latest_attempt_at: row.latest_attempt_at as string,
      }
    : undefined;
}
