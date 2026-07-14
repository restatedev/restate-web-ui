import type { QueryContext } from '../../shared';
import {
  hasCompleteVqueueInvocationPopulation,
  supportsInvocationV2Vqueues,
  type InvocationFilterV2,
  type ResolvedInvocationModeV2,
} from '../shared';
import {
  isInvocationListFieldAvailableOnTable,
  isInvocationListTableAvailable,
} from '../invocationListFields';

type SummarySource =
  | 'sys_vqueue_meta_and_sys_vqueues'
  | 'sys_invocation_status_and_sys_invocation_state_exact_summary'
  | 'sys_invocation_status_and_sys_invocation_state';

type SummaryQueryPlan =
  | { source: SummarySource; coverage: 'none' }
  | {
      source: SummarySource;
      coverage: 'partial' | 'full';
      filters: InvocationFilterV2[];
    };

function createQueryPlanFromSysVqueueMetaAndSysVqueues(
  context: QueryContext,
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
  view: 'all' | 'stages' | 'breakdowns',
): SummaryQueryPlan {
  const source = 'sys_vqueue_meta_and_sys_vqueues' as const;
  if (
    !supportsInvocationV2Vqueues(context) ||
    !isInvocationListTableAvailable(context, 'sys_vqueue_meta') ||
    !isInvocationListTableAvailable(context, 'sys_vqueues') ||
    !isInvocationListFieldAvailableOnTable(
      context,
      'target_service_name',
      'sys_vqueue_meta',
    ) ||
    !isInvocationListFieldAvailableOnTable(context, 'status', 'sys_vqueues')
  ) {
    return { source, coverage: 'none' };
  }

  if (
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_vqueue_meta',
        ),
    )
  ) {
    return { source, coverage: 'none' };
  }

  if (view === 'stages') {
    return { source, coverage: 'full', filters };
  }

  if (filters.some((filter) => filter.field === 'target_service_name')) {
    return { source, coverage: 'none' };
  }

  const canReturnEveryRequestedSummary =
    filters.length === 0 ||
    (hasCompleteVqueueInvocationPopulation(context) && mode.type === 'sampled');

  return {
    source,
    coverage: canReturnEveryRequestedSummary ? 'full' : 'partial',
    filters,
  };
}

function createQueryPlanFromSysInvocationStatusAndSysInvocationState(
  context: QueryContext,
  filters: InvocationFilterV2[],
): SummaryQueryPlan {
  const source = 'sys_invocation_status_and_sys_invocation_state' as const;
  if (
    !isInvocationListTableAvailable(context, 'sys_invocation_status') ||
    !isInvocationListTableAvailable(context, 'sys_invocation_state') ||
    !isInvocationListFieldAvailableOnTable(
      context,
      'target_service_name',
      'sys_invocation_status',
    ) ||
    !isInvocationListFieldAvailableOnTable(
      context,
      'status',
      'sys_invocation_status',
    ) ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_invocation_status',
        ),
    )
  ) {
    return { source, coverage: 'none' };
  }

  return { source, coverage: 'full', filters };
}

function createExactSummaryQueryPlanFromSysInvocationStatusAndSysInvocationState(
  context: QueryContext,
  filters: InvocationFilterV2[],
  view: 'all' | 'stages' | 'breakdowns',
): SummaryQueryPlan {
  const source =
    'sys_invocation_status_and_sys_invocation_state_exact_summary' as const;
  if (
    view !== 'stages' ||
    filters.some((filter) => filter.field === 'status') ||
    !isInvocationListTableAvailable(context, 'sys_invocation_status') ||
    !isInvocationListTableAvailable(context, 'sys_invocation_state') ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          context,
          filter.field,
          'sys_invocation_status',
        ),
    )
  ) {
    return { source, coverage: 'none' };
  }

  return { source, coverage: 'full', filters };
}

export function createInvocationSummaryQueryPlan(
  context: QueryContext,
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
  view: 'all' | 'stages' | 'breakdowns',
) {
  const sourcePlans = [
    createQueryPlanFromSysVqueueMetaAndSysVqueues(context, filters, mode, view),
    createExactSummaryQueryPlanFromSysInvocationStatusAndSysInvocationState(
      context,
      filters,
      view,
    ),
    createQueryPlanFromSysInvocationStatusAndSysInvocationState(
      context,
      filters,
    ),
  ];
  const selectedPlan =
    sourcePlans.find(({ coverage }) => coverage === 'full') ??
    sourcePlans.find(({ coverage }) => coverage === 'partial');

  return { sourcePlans, selectedPlan };
}
