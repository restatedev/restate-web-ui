import type { BatchInvocationsRequestBody } from '@restate/data-access/admin-api/spec';
import { type QueryContext } from './shared';
import { batchProcessInvocations } from './batchProcessor';
import { getInvocationIds } from './getInvocationIds';

export async function batchCancelInvocations(
  this: QueryContext,
  request: BatchInvocationsRequestBody,
) {
  if ('invocationIds' in request) {
    if (request.dryRun) {
      return Response.json({
        successful: 0,
        failed: 0,
        failedInvocationIds: [],
        total: request.invocationIds.length,
        isTotalLowerBound: false,
        hasMore: false,
      });
    }

    const result = await batchProcessInvocations(
      request.invocationIds,
      (invocationId) =>
        this.adminApi(`/invocations/${invocationId}/cancel`, {
          method: 'PATCH',
        }),
    );

    return Response.json({
      ...result,
      total: request.invocationIds.length,
      isTotalLowerBound: false,
      hasMore: false,
    });
  }

  const { invocationIds, total, isTotalLowerBound, hasMore, lastCreatedAt } =
    await getInvocationIds.call(this, {
      filters: request.filters,
      pageSize: request.dryRun ? 0 : request.pageSize,
      createdAfter: request.createdAfter,
      countTotal: request.dryRun,
    });

  const result = request.dryRun
    ? { successful: 0, failed: 0, failedInvocationIds: [] }
    : await batchProcessInvocations(invocationIds, (invocationId) =>
        this.adminApi(`/invocations/${invocationId}/cancel`, {
          method: 'PATCH',
        }),
      );

  return Response.json({
    ...result,
    total,
    isTotalLowerBound,
    hasMore,
    lastCreatedAt,
  });
}
