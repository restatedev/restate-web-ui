import type {
  InvocationComputedStatus2,
  RawInvocation,
} from '@restate/data-access/admin-api/spec';

export function getComputedInvocationStatus(invocation: RawInvocation): {
  isRetrying: boolean;
  status: InvocationComputedStatus2;
} {
  const isSuccessful = invocation.completion_result === 'success';
  const isCancelled = Boolean(
    invocation.completion_result === 'failure' &&
      invocation.completion_failure &&
      [
        '[409] canceled',
        '[409] cancelled',
        '[409 aborted] canceled',
        '[409 aborted] cancelled',
      ].includes(invocation.completion_failure?.toLowerCase()),
  );
  const isKilled = Boolean(
    invocation.completion_result === 'failure' &&
      ['[409] killed', '[409 aborted] killed'].includes(
        invocation.completion_failure?.toLowerCase() ?? '',
      ),
  );
  const isRunning = invocation.status === 'running';
  const isCompleted = invocation.status === 'completed';

  const hasLastFailure = Boolean(invocation.last_failure);
  const isRetrying = Boolean(
    invocation.status === 'backing-off' ||
      (invocation.retry_count &&
        invocation.retry_count > 1 &&
        isRunning &&
        hasLastFailure),
  );

  if (isCompleted) {
    if (isSuccessful) {
      return { status: 'succeeded', isRetrying: false };
    }
    if (isKilled) {
      return { status: 'killed', isRetrying: false };
    }
    if (isCancelled) {
      return { status: 'cancelled', isRetrying: false };
    }
    if (invocation.completion_result === 'failure') {
      return { status: 'failed', isRetrying: false };
    }
  }

  if (isRetrying) {
    return {
      status: invocation.status as InvocationComputedStatus2,
      isRetrying: true,
    };
  }

  switch (invocation.status) {
    case 'pending':
    case 'ready':
    case 'scheduled':
    case 'running':
    case 'suspended':
      return { status: invocation.status, isRetrying: false };

    default: {
      console.warn(
        invocation.status,
        invocation.completion_result,
        invocation.completion_failure,
      );
      throw new Error('Cannot calculate status');
    }
  }
}
