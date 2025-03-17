import type { RawInvocation } from '@restate/data-access/admin-api/spec';
import { getComputedInvocationStatus } from './getComputedInvocationStatus';

export function convertInvocation(invocation: RawInvocation) {
  return {
    ...invocation,
    status: getComputedInvocationStatus(invocation),
  };
}
