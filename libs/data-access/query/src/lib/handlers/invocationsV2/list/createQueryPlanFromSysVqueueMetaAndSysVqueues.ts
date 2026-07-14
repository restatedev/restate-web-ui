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
import type { SysVqueueMetaAndVqueuesSourcePlan } from './types';

/** Reports whether bounded queue metadata plus entries can satisfy the query. */
export function createQueryPlanFromSysVqueueMetaAndSysVqueues(
  context: QueryContext,
  filters: InvocationFilterV2[],
  statuses: InvocationStatusV2[] | undefined,
  sort: InvocationSortV2 | undefined,
): SysVqueueMetaAndVqueuesSourcePlan {
  if (
    !isInvocationListTableAvailable(context, 'sys_vqueue_meta') ||
    !isInvocationListTableAvailable(context, 'sys_vqueues')
  ) {
    return {
      source: 'sys_vqueue_meta_and_sys_vqueues',
      coverage: 'none',
    };
  }
  if (
    !filters.some((filter) =>
      isInvocationListFieldAvailableOnTable(
        context,
        filter.field,
        'sys_vqueue_meta',
      ),
    ) ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_vqueues',
        ) &&
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_vqueue_meta',
        ),
    )
  ) {
    return {
      source: 'sys_vqueue_meta_and_sys_vqueues',
      coverage: 'none',
    };
  }
  if (
    sort &&
    !isInvocationListFieldAvailableOnTable(context, sort.field, 'sys_vqueues')
  ) {
    return {
      source: 'sys_vqueue_meta_and_sys_vqueues',
      coverage: 'none',
    };
  }

  return {
    source: 'sys_vqueue_meta_and_sys_vqueues',
    coverage: 'full',
    filters,
    statuses,
    sort,
  };
}
