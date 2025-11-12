import type { BatchInvocationsResponse } from '@restate/data-access/admin-api/spec';

type ProcessorResult = {
  invocationId: string;
  success: boolean;
};

export async function batchProcessInvocations(
  invocationIds: string[],
  processor: (invocationId: string) => Promise<void>,
): Promise<BatchInvocationsResponse> {
  const results = await Promise.allSettled(
    invocationIds.map(async (invocationId) => {
      try {
        await processor(invocationId);
        return { invocationId, success: true };
      } catch {
        return { invocationId, success: false };
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
    .map((r) => r.invocationId);

  return {
    successful,
    failed,
    failedInvocationIds,
  };
}
