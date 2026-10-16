import {
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import { isInvocationListFieldAvailableOnTable } from '../invocationListFields';
import type { SysVqueuesSourcePlan } from './types';

/** Reports whether VQueue entries can satisfy the complete candidate query. */
export function createQueryPlanFromSysVqueues(
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): SysVqueuesSourcePlan {
  if (
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(filter.field, 'sys_vqueues'),
    )
  ) {
    return { source: 'sys_vqueues', coverage: 'none' };
  }
  if (
    sort &&
    !isInvocationListFieldAvailableOnTable(sort.field, 'sys_vqueues')
  ) {
    return { source: 'sys_vqueues', coverage: 'none' };
  }

  return {
    source: 'sys_vqueues',
    coverage: 'full',
    filters,
    statuses,
    sort,
  };
}
