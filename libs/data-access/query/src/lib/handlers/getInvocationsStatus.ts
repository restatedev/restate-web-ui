import type { QueryContext } from './shared';

type InvocationStatus =
  | 'succeeded'
  | 'failed'
  | 'running'
  | 'suspended'
  | 'scheduled'
  | 'pending'
  | 'ready'
  | 'paused'
  | 'backing-off';

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function getInvocationStatus(
  status?: string,
  completionResult?: string,
): InvocationStatus | undefined {
  if (status === 'completed') {
    return completionResult === 'success' ? 'succeeded' : 'failed';
  }

  switch (status) {
    case 'running':
    case 'suspended':
    case 'scheduled':
    case 'pending':
    case 'ready':
    case 'paused':
    case 'backing-off':
      return status;
    default:
      return undefined;
  }
}

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

  const { rows } = await this.query(
    `SELECT id, status, completion_result, pinned_deployment_id, last_attempt_deployment_id FROM sys_invocation WHERE id IN (${uniqueInvocationIds.map(quoteSqlString).join(', ')})`,
  );

  const invocationsById = new Map(
    rows.map((row) => [
      row.id as string,
      {
        status: getInvocationStatus(
          row.status as string | undefined,
          row.completion_result as string | undefined,
        ),
        pinnedDeploymentId: row.pinned_deployment_id as string | undefined,
        lastAttemptDeploymentId: row.last_attempt_deployment_id as
          | string
          | undefined,
      },
    ]),
  );

  return Response.json({
    invocations: Object.fromEntries(
      uniqueInvocationIds.map((invocationId) => [
        invocationId,
        invocationsById.get(invocationId) ?? {},
      ]),
    ),
  });
}
