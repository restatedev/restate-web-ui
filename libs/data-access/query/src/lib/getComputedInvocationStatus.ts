import type {
  InvocationComputedStatus,
  RawInvocation,
} from '@restate/data-access/admin-api/spec';

export function getComputedInvocationStatus(
  invocation: RawInvocation
): InvocationComputedStatus {
  const isSuccessful = invocation.completion_result === 'success';
  const isCancelled = Boolean(
    invocation.completion_result === 'failure' &&
      invocation.completion_failure?.startsWith('[409]')
  );
  const isKilled = Boolean(
    isCancelled && invocation.completion_failure?.includes('killed')
  );
  const isRunning = invocation.status === 'running';
  const isCompleted = invocation.status === 'completed';
  const isRetrying = Boolean(
    invocation.retry_count &&
      invocation.retry_count > 1 &&
      (isRunning || invocation.status === 'backing-off')
  );

  if (isCompleted) {
    if (isSuccessful) {
      return 'succeeded';
    }
    if (isKilled) {
      return 'killed';
    }
    if (isCancelled) {
      return 'cancelled';
    }
    if (invocation.completion_result === 'failure') {
      return 'failed';
    }
  }

  if (isRetrying) {
    return 'retrying';
  }

  switch (invocation.status) {
    case 'pending':
      return 'pending';
    case 'ready':
      return 'ready';
    case 'scheduled':
      return 'scheduled';
    case 'running':
      return 'running';
    case 'suspended':
      return 'suspended';

    default:
      throw new Error('Cannot calculate status');
  }
}
