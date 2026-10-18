import { isInvocationListFieldAvailableOnTable } from '../invocationListFields.js';
import {
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared.js';
import type { BestEffortSysInvocationStatusSourcePlan } from './types.js';

/**
 * Reports whether invocation status can drive one bounded, best-effort
 * candidate set whose statuses are resolved through entry-status point
 * lookups.
 */
export function createBestEffortQueryPlanFromSysInvocationStatus(
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): BestEffortSysInvocationStatusSourcePlan {
  if (
    !statuses?.some((status) => STATUSES_RESOLVED_FROM_VQUEUE.has(status)) ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          filter.field,
          'sys_invocation_status',
        ),
    ) ||
    (sort &&
      !isInvocationListFieldAvailableOnTable(
        sort.field,
        'sys_invocation_status',
      ))
  ) {
    return {
      source: 'best_effort_sys_invocation_status',
      coverage: 'none',
    };
  }

  return {
    source: 'best_effort_sys_invocation_status',
    coverage: 'full',
    filters,
    statuses,
    sort,
  };
}
