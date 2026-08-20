import { TERMINAL_INVOCATION_STATUSES } from '../../../invocationStatuses';
import type { QueryContext } from '../../shared';
import { type InvocationFilterV2, type InvocationSortV2 } from '../shared';
import { createQueryPlanFromSysInvocationStatus } from './createQueryPlanFromSysInvocationStatus';
import { createBestEffortQueryPlanFromSysInvocationStatus } from './createBestEffortQueryPlanFromSysInvocationStatus';
import { createQueryPlanFromSysVqueueMetaAndSysVqueues } from './createQueryPlanFromSysVqueueMetaAndSysVqueues';
import { createQueryPlanFromSysVqueues } from './createQueryPlanFromSysVqueues';
import { createVqueueListQueryPlan } from './createVqueueListQueryPlan';
import type {
  InvocationCandidateSourcePlan,
  VqueueListQueryPlan,
} from './types';

const TERMINAL_STATUSES = new Set<string>(TERMINAL_INVOCATION_STATUSES);

export function createQueryPlanWhenCompletedVqueuesWereSkipped(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
): VqueueListQueryPlan {
  const normalPlan = createVqueueListQueryPlan(context, filters, sort);
  const { statusSelection } = normalPlan;
  const includesTerminalStatus =
    statusSelection.type === 'all' ||
    [...statusSelection.statuses].some((status) =>
      TERMINAL_STATUSES.has(status),
    );

  if (!includesTerminalStatus) return normalPlan;

  if (sort?.field === 'transitioned_at') {
    return {
      statusSelection,
      sourcePlans: normalPlan.sourcePlans,
      error:
        'transitioned_at cannot sort terminal invocations because their transition timestamps are unavailable',
    };
  }

  const candidateFilters = filters.filter(
    (filter) => filter.field !== 'id' && filter.field !== 'status',
  );
  if (statusSelection.type === 'all') {
    const sourcePlan = createQueryPlanFromSysInvocationStatus(
      context,
      candidateFilters,
      undefined,
      sort,
    );
    return { statusSelection, sourcePlans: [sourcePlan] };
  }

  const statuses = [...statusSelection.statuses];
  const terminalStatuses = statuses.filter((status) =>
    TERMINAL_STATUSES.has(status),
  );
  const liveStatuses = statuses.filter(
    (status) => !TERMINAL_STATUSES.has(status),
  );
  const invocationStatusPlan = createQueryPlanFromSysInvocationStatus(
    context,
    candidateFilters,
    statuses,
    sort,
  );
  if (invocationStatusPlan.coverage === 'full') {
    return { statusSelection, sourcePlans: [invocationStatusPlan] };
  }
  const liveSourcePlan = [
    createQueryPlanFromSysVqueues(
      context,
      candidateFilters,
      liveStatuses,
      sort,
    ),
    createQueryPlanFromSysVqueueMetaAndSysVqueues(
      context,
      candidateFilters,
      liveStatuses,
      sort,
    ),
  ].find((sourcePlan) => sourcePlan.coverage === 'full');
  const terminalSourcePlan = createQueryPlanFromSysInvocationStatus(
    context,
    candidateFilters,
    terminalStatuses,
    sort,
  );
  const canMergeLiveAndTerminalResults =
    sort === undefined || sort.field === 'created_at';

  if (
    canMergeLiveAndTerminalResults &&
    terminalSourcePlan.coverage === 'full' &&
    liveSourcePlan?.coverage === 'full'
  ) {
    const sourcePlans: InvocationCandidateSourcePlan[] = [
      {
        ...terminalSourcePlan,
        coverage: 'partial',
        statuses: terminalStatuses,
      },
      {
        ...liveSourcePlan,
        coverage: 'partial',
        statuses: liveStatuses,
      },
    ];
    return {
      statusSelection,
      sourcePlans,
    };
  }

  const bestEffortPlan = createBestEffortQueryPlanFromSysInvocationStatus(
    context,
    candidateFilters,
    statuses,
    sort,
  );
  return { statusSelection, sourcePlans: [bestEffortPlan] };
}
