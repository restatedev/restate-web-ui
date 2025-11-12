import type { BatchInvocationsRequestBody } from '@restate/data-access/admin-api/spec';
import { type QueryContext } from './shared';
import { batchProcessInvocations } from './batchProcessor';

export async function batchKillInvocations(
  this: QueryContext,
  request: BatchInvocationsRequestBody,
) {
  if ('invocationIds' in request) {
    const result = await batchProcessInvocations(
      request.invocationIds,
      (invocationId) =>
        this.adminApi(`/invocations/${invocationId}/kill`, {
          method: 'PATCH',
        }),
    );

    return Response.json(result);
  }

  return new Response('Not implemented', { status: 501 });
}
