import type { VqueueStatus } from '../convertInvocation';
import { type QueryContext, quoteSqlString } from './shared';

// Whether the VQueue status overlay should run: the server exposes virtual
// queues and the local flag is on.
export function vqueueStatusEnabled(ctx: QueryContext): boolean {
  return ctx.features.has('vqueues');
}

// Point lookup keyed by entry_id (unique per invocation). List population
// scans still use sys_vqueues so positive stage predicates can prune keyspaces.
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
    `SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN (${ids
      .map(quoteSqlString)
      .join(', ')}) AND entry_kind = 'invocation'`,
  );
  for (const row of rows) {
    if (row.entry_id) {
      statuses.set(row.entry_id as string, {
        vqueue_id: row.vqueue_id as string,
        stage: row.stage as VqueueStatus['stage'],
        status: row.status as string,
        next_at: row.next_at as string,
        created_at: row.created_at as string,
        transitioned_at: row.transitioned_at as string,
        first_attempt_at: row.first_attempt_at as string,
        latest_attempt_at: row.latest_attempt_at as string,
        first_runnable_at: row.first_runnable_at as string,
        retry_attempts: row.retry_attempts as number,
        num_attempts: row.num_attempts as number,
        num_errors: row.num_errors as number,
        deployment: row.deployment as string,
      });
    }
  }
  return statuses;
}
