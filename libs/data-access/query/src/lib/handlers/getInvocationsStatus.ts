import type { RawInvocation } from '@restate/data-access-admin-api-spec';
import { convertInvocation } from '../convertInvocation.js';
import {
  chunkIds,
  isInvocationId,
  type QueryContext,
  quoteSqlString,
} from './shared.js';
import { fetchVqueueStatuses } from './vqueue.js';

export async function getInvocationsStatus(
  this: QueryContext,
  invocationIds: string[],
) {
  const uniqueInvocationIds = [
    ...new Set(invocationIds.filter(isInvocationId)),
  ];

  if (uniqueInvocationIds.length === 0) {
    return Response.json({ invocations: {} });
  }

  const [invocationRows, vqueueStatuses] = await Promise.all([
    Promise.all(
      chunkIds(uniqueInvocationIds).map((ids) =>
        this.query(
          `SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name, vqueue_id, created_at, scheduled_at, scheduled_start_at, running_at, completed_at FROM sys_invocation WHERE id IN (${ids.map(quoteSqlString).join(', ')})`,
          'invocations/statuses',
        ),
      ),
    ).then((results) => results.flatMap(({ rows }) => rows)),
    fetchVqueueStatuses(this, uniqueInvocationIds),
  ]);

  const invocationsById = new Map<
    string,
    {
      status: string;
      pinnedDeploymentId?: string;
      lastAttemptDeploymentId?: string;
      targetServiceName?: string;
      targetServiceKey?: string;
      targetHandlerName?: string;
      createdAt?: string;
      scheduledStartAt?: string;
      runningAt?: string;
      completedAt?: string;
    }
  >();
  for (const row of invocationRows) {
    const invocation = convertInvocation(
      row as RawInvocation,
      vqueueStatuses.get(row.id as string),
    );
    invocationsById.set(row.id as string, {
      status: invocation.status,
      pinnedDeploymentId: invocation.pinned_deployment_id,
      lastAttemptDeploymentId: row.last_attempt_deployment_id as
        | string
        | undefined,
      targetServiceName: row.target_service_name as string | undefined,
      targetServiceKey: row.target_service_key as string | undefined,
      targetHandlerName: row.target_handler_name as string | undefined,
      createdAt: invocation.created_at,
      scheduledStartAt:
        invocation.scheduled_start_at ??
        (invocation.status === 'scheduled'
          ? invocation.first_runnable_at
          : undefined),
      runningAt: invocation.running_at,
      completedAt: invocation.completed_at,
    });
  }

  return Response.json({
    invocations: Object.fromEntries(
      uniqueInvocationIds.map((invocationId) => [
        invocationId,
        invocationsById.get(invocationId) ?? {},
      ]),
    ),
  });
}
