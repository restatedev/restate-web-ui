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

  const statusesResolvedByInvocationStatus = statuses?.filter(
    (status) => !STATUSES_RESOLVED_FROM_VQUEUE.has(status),
  );
  const includesStatusResolvedFromVqueue =
    statuses?.some((status) => STATUSES_RESOLVED_FROM_VQUEUE.has(status)) ??
    false;
  if (
    includesStatusResolvedFromVqueue &&
    statusesResolvedByInvocationStatus?.length === 0
  ) {
    return { source: 'sys_invocation_status', coverage: 'none' };
  }

  if (includesStatusResolvedFromVqueue) {
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
