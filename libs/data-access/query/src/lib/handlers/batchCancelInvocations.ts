import type { BatchInvocationsRequestBody } from '@restate/data-access/admin-api/spec';
import { type QueryContext } from './shared';
import { batchProcessInvocations } from './batchProcessor';
import { getInvocationIds } from './getInvocationIds';

export async function batchCancelInvocations(
  this: QueryContext,
  request: BatchInvocationsRequestBody,
) {
  if ('invocationIds' in request) {
    const result = await batchProcessInvocations(
      request.invocationIds,
      (invocationId) =>
        this.adminApi(`/invocations/${invocationId}/cancel`, {
          method: 'PATCH',
        }),
      (invocationIds) =>
        this.adminApi('/internal/invocations_batch_operations/cancel', {
          method: 'POST',
          json: { invocation_ids: invocationIds },
        }),
      this.restateVersion,
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
    (invocationId) =>
      this.adminApi(`/invocations/${invocationId}/cancel`, {
        method: 'PATCH',
      }),
    (invocationIds) =>
      this.adminApi('/internal/invocations_batch_operations/cancel', {
        method: 'POST',
        json: { invocation_ids: invocationIds },
      }),
    this.restateVersion,
  );

  return Response.json({
    ...result,
    hasMore,
    lastCreatedAt,
  });
}
