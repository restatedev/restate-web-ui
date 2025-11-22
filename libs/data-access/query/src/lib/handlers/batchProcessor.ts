import type { BatchInvocationsResponse } from '@restate/data-access/admin-api/spec';

type ProcessorResult = {
  invocationId: string;
  success: boolean;
  error?: string;
};

export async function batchProcessInvocations(
  invocationIds: string[],
  processor: (invocationId: string) => Promise<void>,
): Promise<
  Pick<
    BatchInvocationsResponse,
    'failed' | 'successful' | 'failedInvocationIds'
  >
> {
  const results = await Promise.allSettled(
    invocationIds.map(async (invocationId) => {
      try {
        await processor(invocationId);
        return { invocationId, success: true };
      } catch (error) {
        return { invocationId, success: false, error: String(error) };
      }
    }),
  );

  const processedResults: ProcessorResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { invocationId: invocationIds[index] ?? '', success: false };
  });

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
