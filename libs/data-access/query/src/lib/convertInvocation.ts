import type {
  Invocation,
  InvocationFuture,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';
import { getComputedInvocationStatus } from './getComputedInvocationStatus';

// Live state for a single invocation read from sys_vqueues. sys_invocation
// can't represent some vqueue sub-states (it reports 'ready' for an entry that
// is actually backing-off, with no next_retry_at), so when present these
// values take precedence.
export type VqueueStatus = {
  status?: string;
  run_at?: string;
  num_attempts?: number;
  num_errors?: number;
  latest_attempt_at?: string;
};

// Overlay live vqueue state onto the sys_invocation row. sys_invocation can't
// represent some vqueue sub-states (it reports 'ready' for an entry that is
// actually backing-off). Add a case as more vqueue states need handling.
function applyVqueueStatus(
  invocation: RawInvocation,
  vqueue?: VqueueStatus,
): RawInvocation {
  if (invocation.status === 'ready' && vqueue?.status === 'backing-off') {
    return {
      ...invocation,
      status: 'backing-off',
      next_retry_at: vqueue.run_at,
      retry_count: vqueue.num_attempts,
      last_start_at: vqueue.latest_attempt_at,
    };
  }

  return invocation;
}

// Latest transient (retry) error read from sys_journal_events. Holds the fields
// overlaid onto last_failure_* below — sys_invocation leaves those empty for
// vqueue-backed invocations that are backing-off.
export type TransientError = {
  error_message?: string;
  error_stacktrace?: string;
  restate_doc_error_code?: string;
  related_command_index?: number;
  related_command_name?: string;
  related_command_type?: string;
};

// When backing-off, fill last_failure_* from the latest transient-error journal
// event rather than sys_invocation (which can be empty, notably for vqueues).
function applyTransientError(
  invocation: RawInvocation,
  transientError?: TransientError,
): RawInvocation {
  if (invocation.status !== 'backing-off' || !transientError) {
    return invocation;
  }
  // last_failure has no separate stack column, so fold the stacktrace into the
  // message (rendered with whitespace-pre-wrap downstream).
  const lastFailure =
    [transientError.error_message, transientError.error_stacktrace]
      .filter(Boolean)
      .join('\n') || undefined;
  return {
    ...invocation,
    last_failure: lastFailure,
    last_failure_error_code: transientError.restate_doc_error_code,
    last_failure_related_command_index: transientError.related_command_index,
    last_failure_related_command_name: transientError.related_command_name,
    last_failure_related_command_type: transientError.related_command_type,
  };
}

function parseInvocationFuture(value?: string): InvocationFuture | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as InvocationFuture;
  } catch {
    return undefined;
  }
}

export function convertInvocation(
  invocation: RawInvocation,
  vqueue?: VqueueStatus,
  transientError?: TransientError,
): Invocation {
  const merged = applyTransientError(
    applyVqueueStatus(invocation, vqueue),
    transientError,
  );
  const {
    last_awaiting_on_future_json,
    suspended_waiting_future_json,
    ...rest
  } = merged;
  const canParseInvocationFuture =
    merged.pinned_service_protocol_version !== undefined &&
    merged.pinned_service_protocol_version > 6;

  return {
    ...rest,
    last_awaiting_on_future_json: canParseInvocationFuture
      ? parseInvocationFuture(last_awaiting_on_future_json)
      : undefined,
    suspended_waiting_future_json: canParseInvocationFuture
      ? parseInvocationFuture(suspended_waiting_future_json)
      : undefined,
    ...getComputedInvocationStatus(merged),
  };
}
