import type { QueryContext } from '../../shared';
import {
  isInvocationListFieldAvailableOnTable,
  isInvocationListTableAvailable,
} from '../invocationListFields';
import {
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import type { BestEffortSysInvocationStatusSourcePlan } from './types';

/**
 * Reports whether invocation status can drive one bounded, best-effort
 * candidate set whose statuses are resolved through entry-status point
 * lookups.
 */
export function createBestEffortQueryPlanFromSysInvocationStatus(
  context: QueryContext,
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): BestEffortSysInvocationStatusSourcePlan {
  if (
    !statuses?.some((status) => STATUSES_RESOLVED_FROM_VQUEUE.has(status)) ||
    !isInvocationListTableAvailable(context, 'sys_invocation_status') ||
    !isInvocationListTableAvailable(context, 'sys_vqueue_entry_status') ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_invocation_status',
        ),
    ) ||
    (sort &&
      !isInvocationListFieldAvailableOnTable(
        context,
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
