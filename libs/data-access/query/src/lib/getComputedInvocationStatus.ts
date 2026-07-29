import type {
  InvocationComputedStatus2,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';

export type InvocationStatusSource = {
  status: RawInvocation['status'] | InvocationComputedStatus2;
  completion_result?: RawInvocation['completion_result'];
  completion_failure?: RawInvocation['completion_failure'];
  last_failure?: RawInvocation['last_failure'];
  retry_count?: RawInvocation['retry_count'];
};

export type InvocationWithComputedStatus = Omit<RawInvocation, 'status'> & {
  status: RawInvocation['status'] | InvocationComputedStatus2;
};

export function getComputedInvocationStatus(
  invocation: InvocationStatusSource,
  retryCountSinceLastStoredCommand?: number,
): {
  isRetrying: boolean;
  status: InvocationComputedStatus2;
} {
  const isSuccessful = invocation.completion_result === 'success';
  const isCancelled = Boolean(
    invocation.completion_result === 'failure' &&
    invocation.completion_failure &&
    ['[409] canceled', '[409] cancelled'].includes(
      invocation.completion_failure?.toLowerCase(),
    ),
  );
  const isKilled = Boolean(
    invocation.completion_result === 'failure' &&
    ['[409] killed'].includes(
      invocation.completion_failure?.toLowerCase() ?? '',
    ),
  );
  const isRunning = invocation.status === 'running';
  const isCompleted = invocation.status === 'completed';

  const hasLastFailure = Boolean(invocation.last_failure);
  const isRetrying =
    invocation.status === 'backing-off' ||
    (isRunning &&
      (retryCountSinceLastStoredCommand !== undefined
        ? retryCountSinceLastStoredCommand > 0
        : Boolean(
            invocation.retry_count &&
            invocation.retry_count > 1 &&
            hasLastFailure,
          )));

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
    case 'yielded':
    case 'scheduled':
    case 'running':
    case 'paused':
    case 'suspended':
    case 'succeeded':
    case 'failed':
    case 'cancelled':
    case 'killed':
      return { status: invocation.status, isRetrying: false };

    default: {
      console.warn(
        invocation.status,
        invocation.completion_result,
        invocation.completion_failure,
      );
      return {
        status: invocation.status as InvocationComputedStatus2,
        isRetrying: false,
      };
    }
  }
}
