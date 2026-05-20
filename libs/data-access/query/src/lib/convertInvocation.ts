import type {
  Invocation,
  InvocationFuture,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';
import { getComputedInvocationStatus } from './getComputedInvocationStatus';

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

export function convertInvocation(invocation: RawInvocation): Invocation {
  const {
    last_awaiting_on_future_json,
    suspended_waiting_future_json,
    ...rest
  } = invocation;
  const canParseInvocationFuture =
    invocation.pinned_service_protocol_version !== undefined &&
    invocation.pinned_service_protocol_version > 6;

  return {
    ...rest,
    last_awaiting_on_future_json: canParseInvocationFuture
      ? parseInvocationFuture(last_awaiting_on_future_json)
      : undefined,
    suspended_waiting_future_json: canParseInvocationFuture
      ? parseInvocationFuture(suspended_waiting_future_json)
      : undefined,
    ...getComputedInvocationStatus(invocation),
  };
}
