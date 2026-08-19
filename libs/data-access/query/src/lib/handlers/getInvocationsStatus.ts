import type { RawInvocation } from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import { type QueryContext, quoteSqlString } from './shared';
import { fetchVqueueStatuses } from './vqueue';

export async function getInvocationsStatus(
  this: QueryContext,
  invocationIds: string[],
) {
  const uniqueInvocationIds = [
    ...new Set(invocationIds.filter((invocationId) => invocationId.length > 0)),
  ];

  if (uniqueInvocationIds.length === 0) {
    return Response.json({ invocations: {} });
  }

  const [invocationResult, vqueueStatuses] = await Promise.all([
    this.query(
      `SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name${this.features.has('vqueues') ? ', vqueue_id' : ''} FROM sys_invocation WHERE id IN (${uniqueInvocationIds.map(quoteSqlString).join(', ')})`,
      'invocations/statuses',
    ),
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
    }
  >();
  for (const row of invocationResult.rows) {
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
