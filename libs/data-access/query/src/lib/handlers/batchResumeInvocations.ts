import type { BatchResumeInvocationsRequestBody } from '@restate/data-access/admin-api/spec';
import { type QueryContext } from './shared';
import { batchProcessInvocations } from './batchProcessor';
import { getInvocationIds } from './getInvocationIds';

export async function batchResumeInvocations(
  this: QueryContext,
  request: BatchResumeInvocationsRequestBody,
) {
  const deployment = request.deployment;

  if ('invocationIds' in request) {
    const result = await batchProcessInvocations(
      request.invocationIds,
      (invocationId) => {
        const url = deployment
          ? `/invocations/${invocationId}/resume?deployment=${encodeURIComponent(deployment)}`
          : `/invocations/${invocationId}/resume`;
        return this.adminApi(url, {
          method: 'PATCH',
        });
      },
    );

    return Response.json({
      ...result,
      total: request.invocationIds.length,
      isTotalLowerBound: false,
      hasMore: false,
    });
  }

  const { invocationIds, hasMore, lastCreatedAt } = await getInvocationIds.call(
    this,
    {
      filters: request.filters,
      pageSize: request.pageSize,
      createdAfter: request.createdAfter,
    },
  );

  const result = await batchProcessInvocations(
    invocationIds,
    (invocationId) => {
      const url = deployment
        ? `/invocations/${invocationId}/resume?deployment=${encodeURIComponent(deployment)}`
        : `/invocations/${invocationId}/resume`;
      return this.adminApi(url, {
        method: 'PATCH',
      });
    },
  );

  return Response.json({
    ...result,
    hasMore,
    lastCreatedAt,
  });
}
