import type { RawInvocation } from '@restate/data-access/admin-api';
import { getComputedInvocationStatus } from './getComputedInvocationStatus';
import { convertToUTC } from './convertToUTC';

export function convertInvocation(invocation: RawInvocation) {
  return {
    ...invocation,
    status: getComputedInvocationStatus(invocation),
    last_start_at: convertToUTC(invocation.last_start_at),
    running_at: convertToUTC(invocation.running_at),
    modified_at: convertToUTC(invocation.modified_at),
    inboxed_at: convertToUTC(invocation.inboxed_at),
    scheduled_at: convertToUTC(invocation.scheduled_at),
    completed_at: convertToUTC(invocation.completed_at),
    created_at: convertToUTC(invocation.created_at),
  };
}
