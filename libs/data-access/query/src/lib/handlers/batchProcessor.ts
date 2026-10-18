import type {
  BatchInvocationsResponse,
  BatchOperationResult,
} from '@restate/data-access-admin-api-spec';
import { isInvocationId } from './shared.js';

type ProcessorResult = {
  invocationId: string;
  success: boolean;
  error?: string;
};

export async function batchProcessInvocations(
  invocationIds: string[],
  batchProcessor: (invocationIds: string[]) => Promise<BatchOperationResult>,
): Promise<
  Pick<
    BatchInvocationsResponse,
    'failed' | 'successful' | 'failedInvocationIds'
  >
> {
  const result = await batchProcessor(invocationIds.filter(isInvocationId));
  const processedResults: ProcessorResult[] = [
    ...result.succeeded.map((invocationId) => ({
      invocationId,
      success: true,
    })),
    ...result.failed.map(({ invocation_id: invocationId, error }) => ({
      invocationId,
      success: false,
      error,
    })),
  ];

  const successful = processedResults.filter((r) => r.success).length;
  const failed = processedResults.filter((r) => !r.success).length;
  const failedInvocationIds = processedResults
    .filter((r) => !r.success && r.invocationId)
    .map((r) => ({ invocationId: r.invocationId, error: r.error || '' }));

  return {
    successful,
    failed,
    failedInvocationIds,
  };
}
