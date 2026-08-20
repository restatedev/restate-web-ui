import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../../shared';
import {
  INVOCATION_STATUSES,
  type InvocationFilterV2,
  type InvocationSortV2,
  type InvocationStatusV2,
} from '../shared';
import { createQueryPlanFromSysInvocationStatus } from './createQueryPlanFromSysInvocationStatus';
import { createBestEffortQueryPlanFromSysInvocationStatus } from './createBestEffortQueryPlanFromSysInvocationStatus';
import { createQueryPlanFromSysVqueueMetaAndSysVqueues } from './createQueryPlanFromSysVqueueMetaAndSysVqueues';
import { createQueryPlanFromSysVqueues } from './createQueryPlanFromSysVqueues';
import type { InvocationStatusSelection, VqueueListQueryPlan } from './types';

export function resolveInvocationStatusSelection(
  filters: InvocationFilterV2[],
): InvocationStatusSelection {
  const statusFilters = (filters as FilterItem[]).filter(
    (filter) => filter.field === 'status',
  );
  if (statusFilters.length === 0) return { type: 'all' };

  const statuses = new Set<InvocationStatusV2>(INVOCATION_STATUSES);
  for (const filter of statusFilters) {
    const values = new Set(
      (filter.type === 'STRING_LIST'
        ? filter.value
        : filter.type === 'STRING'
          ? [filter.value]
          : []) as InvocationStatusV2[],
    );
    if (filter.operation === 'NOT_IN' || filter.operation === 'NOT_EQUALS') {
      for (const status of values) statuses.delete(status);
    } else {
      for (const status of statuses) {
        if (!values.has(status)) statuses.delete(status);
      }
    }
  }
  return { type: 'selected', statuses };
}

/**
 * Collects independent coverage reports in executor preference order:
 * direct VQueues, bounded metadata plus VQueues, invocation status, and the
 * composite status-candidate/entry-status lookup.
 */

export function createVqueueListQueryPlan(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
): VqueueListQueryPlan {
  const statusSelection = resolveInvocationStatusSelection(filters);
  const candidateFilters = filters.filter(
    (filter) => filter.field !== 'id' && filter.field !== 'status',
  );
  const statuses =
    statusSelection.type === 'selected'
      ? [...statusSelection.statuses]
      : undefined;

  const sourcePlans = [
    createQueryPlanFromSysVqueues(context, candidateFilters, statuses, sort),
    createQueryPlanFromSysVqueueMetaAndSysVqueues(
      context,
      candidateFilters,
      statuses,
      sort,
    ),
    createQueryPlanFromSysInvocationStatus(
      context,
      candidateFilters,
      statuses,
      sort,
    ),
    createBestEffortQueryPlanFromSysInvocationStatus(
      context,
      candidateFilters,
      statuses,
      sort,
    ),
  ];

  return { statusSelection, sourcePlans };
}
