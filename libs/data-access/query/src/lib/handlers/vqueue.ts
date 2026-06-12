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

// Whether the vqueue status overlay should run: the server exposes virtual
// queues (so sys_vqueues exists) and the local flag is on.
export function vqueueStatusEnabled(ctx: QueryContext): boolean {
  return ctx.features.has('vqueues') && vqueueStatusFlagEnabled();
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

// Batched lookup for lists: resolve vqueue state for many invocations at once,
// keyed by entry_id (unique per invocation). Returns a map id → status; queued
// invocations are present, the rest are absent. Unlike the single-id lookup it
// queries entry_id directly, so it gates on the `vqueues` capability explicitly
// (sys_vqueues may not exist otherwise).
export async function fetchVqueueStatuses(
  ctx: QueryContext,
  invocationIds: string[],
): Promise<Map<string, VqueueStatus>> {
  const statuses = new Map<string, VqueueStatus>();
  if (!vqueueStatusEnabled(ctx)) {
    return statuses;
  }
  const ids = [...new Set(invocationIds.filter(Boolean))];
  if (ids.length === 0) {
    return statuses;
  }

  const { rows } = await ctx.query(
    `SELECT entry_id, status, run_at, num_attempts, latest_attempt_at FROM sys_vqueues WHERE entry_id IN (${ids
      .map(quoteSqlString)
      .join(', ')})`,
  );
  for (const row of rows) {
    if (row.entry_id) {
      statuses.set(row.entry_id as string, {
        status: row.status as string,
        run_at: row.run_at as string,
        num_attempts: row.num_attempts as number,
        latest_attempt_at: row.latest_attempt_at as string,
      });
    }
  }
  return statuses;
}
