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
};

// Overlay live vqueue state onto the sys_invocation row. sys_invocation can't
// represent some vqueue sub-states (it reports 'ready' for an entry that is
// actually backing-off). Add a case as more vqueue states need handling.
function applyVqueueStatus(
  invocation: RawInvocation,
  vqueue?: VqueueStatus,
): RawInvocation {
  switch (vqueue?.status) {
    case 'backing-off':
      return {
        ...invocation,
        status: 'backing-off',
        next_retry_at: vqueue.run_at,
        retry_count: vqueue.num_attempts,
      };
    default:
      return invocation;
  }
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
): Invocation {
  const merged = applyVqueueStatus(invocation, vqueue);
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
