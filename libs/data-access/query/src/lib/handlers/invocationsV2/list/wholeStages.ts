import {
  getInvocationStatusesForStage,
  type FilterItem,
} from '@restate/data-access-admin-api-spec';
import type { VqueueStage } from '../../../invocationStatuses';
import { matchesStringFilter } from '../summary/matchesStringFilter';
import type { InvocationFilterV2 } from '../shared';
import { resolveInvocationStatusSelection } from './createVqueueListQueryPlan';

export const VQUEUE_STAGES: VqueueStage[] = [
  'inbox',
  'running',
  'suspended',
  'paused',
  'finished',
];

export function resolveWholeStages(filters: InvocationFilterV2[]) {
  const stageFilters = (filters as FilterItem[]).filter(
    (filter) => filter.field === 'stage',
  );
  const statusSelection = resolveInvocationStatusSelection(filters);
  const stages = VQUEUE_STAGES.filter((stage) =>
    stageFilters.every((filter) => matchesStringFilter(stage, filter)),
  );
  if (statusSelection.type === 'all') return stages;

  const statusStages = stages.filter((stage) =>
    getInvocationStatusesForStage(stage).some((status) =>
      statusSelection.statuses.has(status),
    ),
  );
  const coversWholeStages = statusStages.every((stage) =>
    getInvocationStatusesForStage(stage).every((status) =>
      statusSelection.statuses.has(status),
    ),
  );
  return coversWholeStages ? statusStages : undefined;
}
