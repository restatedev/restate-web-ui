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
      invocation.completion_failure &&
      ['[409] canceled', '[409] cancelled', '[409 aborted] canceled'].includes(
        invocation.completion_failure?.toLowerCase()
      )
  );
  const isKilled = Boolean(
    invocation.completion_result === 'failure' &&
      ['[409] killed', '[409 aborted] killed'].includes(
        invocation.completion_failure?.toLowerCase() ?? ''
      )
  );
  const isRunning = invocation.status === 'running';
  const isCompleted = invocation.status === 'completed';
  const isOldJournalFormat =
    !invocation.pinned_service_protocol_version ||
    invocation.pinned_service_protocol_version < 5;
  const isStuckOnLastStep = isOldJournalFormat
    ? typeof invocation.last_failure_related_entry_index === 'number' &&
      typeof invocation.journal_size === 'number' &&
      invocation.last_failure_related_entry_index + 1 >= invocation.journal_size
    : typeof invocation.last_failure_related_command_index === 'number' &&
      typeof invocation.journal_commands_size === 'number' &&
      invocation.last_failure_related_command_index + 1 >=
        invocation.journal_commands_size;
  const isRetrying = Boolean(
    invocation.status === 'backing-off' ||
      (invocation.retry_count &&
        invocation.retry_count > 1 &&
        isRunning &&
        isStuckOnLastStep)
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

    default: {
      console.warn(
        invocation.status,
        invocation.completion_result,
        invocation.completion_failure
      );
      throw new Error('Cannot calculate status');
    }
  }
}
