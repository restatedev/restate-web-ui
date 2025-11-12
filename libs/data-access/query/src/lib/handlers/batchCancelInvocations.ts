import type { BatchInvocationsRequestBody } from '@restate/data-access/admin-api/spec';
import { type QueryContext } from './shared';

export async function batchCancelInvocations(
  this: QueryContext,
  _request: BatchInvocationsRequestBody,
) {
  return new Response('Not implemented', { status: 501 });
}
