import type { QueryContext } from '../../shared';
import type {
  InvocationFilterV2,
  InvocationSortV2,
  ResolvedInvocationModeV2,
} from '../shared';
import { createVqueueListQueryPlan } from './createVqueueListQueryPlan';
import { executeVqueueListQueryPlan } from './executeVqueueListQueryPlan';

/** Lists invocations when VQueues contain the complete invocation population. */
export function listInvocationsFromVqueues(
  context: QueryContext,
  filters: InvocationFilterV2[],
  sort: InvocationSortV2 | undefined,
  mode: ResolvedInvocationModeV2,
  requestTime: string,
) {
  const queryPlan = createVqueueListQueryPlan(context, filters, sort);
  return executeVqueueListQueryPlan(
    context,
    queryPlan,
    filters,
    sort,
    mode,
    requestTime,
  );
}
