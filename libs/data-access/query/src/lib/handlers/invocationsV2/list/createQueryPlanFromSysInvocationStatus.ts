import {
  STATUSES_RESOLVED_FROM_VQUEUE,
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import type { QueryContext } from '../../shared';
import {
  isInvocationListFieldAvailableOnTable,
  isInvocationListTableAvailable,
} from '../invocationListFields';
import type { SysInvocationStatusSourcePlan } from './types';

/** Reports the statuses that invocation status can resolve without VQueue data. */
export function createQueryPlanFromSysInvocationStatus(
  context: QueryContext,
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): SysInvocationStatusSourcePlan {
  if (
    !isInvocationListTableAvailable(context, 'sys_invocation_status') ||
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
    return { source: 'sys_invocation_status', coverage: 'none' };
  }

  const selectedStatuses = statuses ? new Set(statuses) : undefined;
  const requiresVqueueStatusResolution =
    selectedStatuses !== undefined &&
    [...STATUSES_RESOLVED_FROM_VQUEUE].some((status) =>
      selectedStatuses.has(status),
    ) &&
    ![...STATUSES_RESOLVED_FROM_VQUEUE].every((status) =>
      selectedStatuses.has(status),
    );
  const statusesResolvedByInvocationStatus = requiresVqueueStatusResolution
    ? statuses?.filter((status) => !STATUSES_RESOLVED_FROM_VQUEUE.has(status))
    : statuses;
  if (
    requiresVqueueStatusResolution &&
    statusesResolvedByInvocationStatus?.length === 0
  ) {
    return { source: 'sys_invocation_status', coverage: 'none' };
  }

  if (requiresVqueueStatusResolution) {
    return {
      source: 'sys_invocation_status',
      coverage: 'partial',
      filters,
      statuses: statusesResolvedByInvocationStatus ?? [],
      sort,
    };
  }

  return {
    source: 'sys_invocation_status',
    coverage: 'full',
    filters,
    statuses: statusesResolvedByInvocationStatus,
    sort,
  };
}
