import type { QueryContext } from '../../shared.js';
import type {
  InvocationFilterV2,
  ResolvedInvocationModeV2,
} from '../shared.js';
import { isInvocationListFieldAvailableOnTable } from '../invocationListFields.js';
import { canSummarizeInvocationsFromStats } from './statsSources.js';

type SummarySource =
  | 'stats'
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
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns',
): SummaryQueryPlan {
  const source = 'sys_vqueue_meta_and_sys_vqueues' as const;
  if (
    !isInvocationListFieldAvailableOnTable(
      'target_service_name',
      'sys_vqueue_meta',
    ) ||
    !isInvocationListFieldAvailableOnTable('status', 'sys_vqueues')
  ) {
    return { source, coverage: 'none' };
  }

  if (
    filters.some(
      (filter) =>
        filter.field !== 'stage' &&
        !isInvocationListFieldAvailableOnTable(filter.field, 'sys_vqueue_meta'),
    )
  ) {
    return { source, coverage: 'none' };
  }

  if (view === 'stages' || view === 'live-stages') {
    return { source, coverage: 'full', filters };
  }

  if (filters.some((filter) => filter.field === 'target_service_name')) {
    return { source, coverage: 'none' };
  }

  const canReturnEveryRequestedSummary =
    filters.length === 0 || mode.type === 'sampled';

  return {
    source,
    coverage: canReturnEveryRequestedSummary ? 'full' : 'partial',
    filters,
  };
}

function createQueryPlanFromSysInvocationStatusAndSysInvocationState(
  filters: InvocationFilterV2[],
): SummaryQueryPlan {
  const source = 'sys_invocation_status_and_sys_invocation_state' as const;
  if (
    !isInvocationListFieldAvailableOnTable(
      'target_service_name',
      'sys_invocation_status',
    ) ||
    !isInvocationListFieldAvailableOnTable('status', 'sys_invocation_status') ||
    filters.some(
      (filter) =>
        filter.field !== 'stage' &&
        !isInvocationListFieldAvailableOnTable(
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
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns',
): SummaryQueryPlan {
  const source =
    'sys_invocation_status_and_sys_invocation_state_exact_summary' as const;
  if (
    mode.type !== 'exact' ||
    view !== 'stages' ||
    filters.some((filter) => filter.field === 'status') ||
    filters.some(
      (filter) =>
        !isInvocationListFieldAvailableOnTable(
          filter.field,
          'sys_invocation_status',
        ),
    )
  ) {
    return { source, coverage: 'none' };
  }

  return { source, coverage: 'full', filters };
}

function createQueryPlanFromStats(
  context: QueryContext,
  filters: InvocationFilterV2[],
): SummaryQueryPlan {
  const source = 'stats' as const;
  return canSummarizeInvocationsFromStats(context, filters)
    ? { source, coverage: 'full', filters }
    : { source, coverage: 'none' };
}

export function createInvocationSummaryQueryPlan(
  context: QueryContext,
  filters: InvocationFilterV2[],
  mode: ResolvedInvocationModeV2,
  view: 'all' | 'stages' | 'live-stages' | 'breakdowns',
) {
  const sourcePlans = [
    createQueryPlanFromStats(context, filters),
    createQueryPlanFromSysVqueueMetaAndSysVqueues(filters, mode, view),
    createExactSummaryQueryPlanFromSysInvocationStatusAndSysInvocationState(
      filters,
      mode,
      view,
    ),
    createQueryPlanFromSysInvocationStatusAndSysInvocationState(filters),
  ];
  const selectedPlan =
    sourcePlans.find(({ coverage }) => coverage === 'full') ??
    sourcePlans.find(({ coverage }) => coverage === 'partial');

  return { sourcePlans, selectedPlan };
}
