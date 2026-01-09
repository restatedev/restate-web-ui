import type {
  BatchInvocationsResponse,
  BatchOperationResult,
} from '@restate/data-access/admin-api/spec';
import semverGt from 'semver/functions/gte';

type ProcessorResult = {
  invocationId: string;
  success: boolean;
  error?: string;
};

export async function batchProcessInvocations(
  invocationIds: string[],
  processor: (invocationId: string) => Promise<void>,
  batchProcessor: (invocationIds: string[]) => Promise<BatchOperationResult> = (
    invocationIds: string[],
  ) => Promise.resolve({ succeeded: [], failed: [] }),
  restateVersion?: string,
): Promise<
  Pick<
    BatchInvocationsResponse,
    'failed' | 'successful' | 'failedInvocationIds'
  >
> {
  const newBatchApiIsSupported = restateVersion
    ? semverGt(restateVersion, '1.6.0')
    : false;

  const batchProcessorWithTransformation: (ids: string[]) => Promise<
    (
      | {
          invocationId: string;
          success: boolean;
          error?: undefined;
        }
      | {
          invocationId: string;
          success: boolean;
          error: string;
        }
    )[]
  > = (invocationIds: string[]) =>
    batchProcessor(invocationIds).then((result) => {
      return [
        ...result.succeeded.map((id) => {
          return { invocationId: id, success: true, error: undefined };
        }),
        ...result.failed.map(({ invocation_id: invocationId, error }) => {
          return { invocationId, success: false, error };
        }),
      ];
    });

  const results = newBatchApiIsSupported
    ? await batchProcessorWithTransformation(invocationIds)
    : await Promise.allSettled(
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
    if (result && 'invocationId' in result) {
      return result;
    }
    if (result && 'status' in result && result.status === 'fulfilled') {
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
