import type {
  Invocation,
  InvocationFuture,
  RawInvocation,
  components,
} from '@restate/data-access/admin-api-spec';
import {
  getComputedInvocationStatus,
  type InvocationWithComputedStatus,
} from './getComputedInvocationStatus';
import { getInvocationStatusFromVqueue } from './invocationStatuses';

export { getInvocationStatusFromVqueue } from './invocationStatuses';

// Live state for a single invocation read from the VQueue entry tables.
export type VqueueStatus = Partial<
  components['schemas']['InvocationVqueueStateV2']
>;

function applyVqueueOverlay(
  invocation: RawInvocation,
  vqueue?: VqueueStatus,
  vqueueStatus?: Invocation['status'],
): InvocationWithComputedStatus {
  if (!vqueue || !vqueueStatus) return invocation;

  return {
    ...invocation,
    status: vqueueStatus,
    pinned_deployment_id: vqueue.deployment ?? invocation.pinned_deployment_id,
    first_runnable_at: vqueue.first_runnable_at ?? invocation.first_runnable_at,
    num_attempts: vqueue.num_attempts ?? invocation.num_attempts,
    num_errors: vqueue.num_errors ?? invocation.num_errors,
    retry_count: vqueue.retry_attempts ?? invocation.retry_count,
    running_at: vqueue.first_attempt_at ?? invocation.running_at,
    last_start_at: vqueue.latest_attempt_at ?? invocation.last_start_at,
    next_retry_at:
      vqueueStatus === 'backing-off'
        ? vqueue.next_at
        : invocation.next_retry_at,
  };
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
  invocation: InvocationWithComputedStatus,
  transientError?: TransientError,
): InvocationWithComputedStatus {
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
  // VQueue status is authoritative whenever its point lookup returns a row.
  // If the overlay is unavailable, retain invocation status rather than hiding
  // an invocation that still exists in sys_invocation.
  const vqueueStatus = getInvocationStatusFromVqueue(vqueue);
  const merged = applyTransientError(
    applyVqueueOverlay(invocation, vqueue, vqueueStatus),
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

  const computedStatus = getComputedInvocationStatus(merged);

  return {
    ...rest,
    last_awaiting_on_future_json: canParseInvocationFuture
      ? parseInvocationFuture(last_awaiting_on_future_json)
      : undefined,
    suspended_waiting_future_json: canParseInvocationFuture
      ? parseInvocationFuture(suspended_waiting_future_json)
      : undefined,
    ...computedStatus,
  };
}

function durationBetween(start: string, end: string): string | undefined {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return undefined;
  return `PT${Number((Math.max(0, endMs - startMs) / 1000).toFixed(3))}S`;
}

export function convertInvocationV2(
  rawInvocation: RawInvocation,
  vqueue: VqueueStatus | undefined,
  requestTime: string,
  transientError?: TransientError,
): components['schemas']['InvocationV2'] {
  const invocation = convertInvocation(rawInvocation, vqueue, transientError);
  const start =
    vqueue?.first_runnable_at ??
    invocation.scheduled_start_at ??
    invocation.created_at;
  const duration =
    invocation.status === 'scheduled'
      ? undefined
      : durationBetween(
          start,
          vqueue?.stage === 'finished'
            ? (rawInvocation.completed_at ??
                vqueue.transitioned_at ??
                requestTime)
            : (rawInvocation.completed_at ?? requestTime),
        );
  const vqueueState =
    vqueue?.stage && vqueue.status
      ? {
          vqueue_id: vqueue.vqueue_id,
          stage: vqueue.stage,
          status: vqueue.status,
          next_at: vqueue.next_at,
          created_at: vqueue.created_at,
          transitioned_at: vqueue.transitioned_at,
          first_attempt_at: vqueue.first_attempt_at,
          latest_attempt_at: vqueue.latest_attempt_at,
          first_runnable_at: vqueue.first_runnable_at,
          retry_attempts: vqueue.retry_attempts,
          num_attempts: vqueue.num_attempts,
          num_errors: vqueue.num_errors,
          deployment: vqueue.deployment,
        }
      : undefined;

  return {
    ...invocation,
    duration,
    ...(vqueueState && { vqueue: vqueueState }),
  };
}
