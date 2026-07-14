import {
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import type { QueryContext } from '../../shared';
import {
  isInvocationListFieldAvailableOnTable,
  isInvocationListTableAvailable,
} from '../invocationListFields';
import type { SysVqueuesSourcePlan } from './types';

/** Reports whether VQueue entries can satisfy the complete candidate query. */
export function createQueryPlanFromSysVqueues(
  context: QueryContext,
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): SysVqueuesSourcePlan {
  if (!isInvocationListTableAvailable(context, 'sys_vqueues')) {
    return { source: 'sys_vqueues', coverage: 'none' };
  }
  if (
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_vqueues',
        ),
    )
  ) {
    return { source: 'sys_vqueues', coverage: 'none' };
  }
  if (
    sort &&
    !isInvocationListFieldAvailableOnTable(context, sort.field, 'sys_vqueues')
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
