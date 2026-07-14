import type { components } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from '../shared';
import { listInvocationsFromInvocationStatusAndState } from './list/listInvocationsFromInvocationStatusAndState';
import { listInvocationsFromVqueues } from './list/listInvocationsFromVqueues';
import { listInvocationsWhenCompletedVqueuesWereSkipped } from './list/listInvocationsWhenCompletedVqueuesWereSkipped';
import {
  badRequest,
  INVOCATIONS_V2_LIMIT,
  resolveInvocationModeV2,
  supportsInvocationV2Vqueues,
  validateInvocationFiltersV2,
  validateInvocationFieldsForServer,
  validateInvocationSortV2,
} from './shared';

export type ListInvocationsV2Args =
  components['schemas']['ListInvocationsV2RequestBody'];
type ListInvocationsV2Response =
  components['schemas']['ListInvocationsV2Response'];

/**
 * Validates a list request, captures one timestamp for consistent computed
 * durations, and routes to VQueue or invocation status/state candidates.
 */
export async function listInvocationsV2(
  this: QueryContext,
  { filters = [], sort, mode: requestedMode }: ListInvocationsV2Args,
): Promise<Response> {
  const filterError = validateInvocationFiltersV2(filters);
  if (filterError) return badRequest(filterError);

  const sortError = validateInvocationSortV2(sort);
  if (sortError) return badRequest(sortError);

  const useVqueues = supportsInvocationV2Vqueues(this);
  const fieldAvailabilityError = validateInvocationFieldsForServer(
    this,
    filters,
    sort,
    useVqueues
      ? ['sys_vqueues', 'sys_vqueue_meta', 'sys_invocation_status']
      : ['sys_invocation_status'],
  );
  if (fieldAvailabilityError) return badRequest(fieldAvailabilityError);

  const { mode, error: modeError } = resolveInvocationModeV2(requestedMode);
  if (modeError || !mode) return badRequest(modeError ?? 'Invalid mode');

  const requestTime = new Date().toISOString();
  let result;
  if (useVqueues && this.features.has('vqueues_migration_skip_completed')) {
    result = await listInvocationsWhenCompletedVqueuesWereSkipped(
      this,
      filters,
      sort,
      mode,
      requestTime,
    );
  } else if (useVqueues) {
    result = await listInvocationsFromVqueues(
      this,
      filters,
      sort,
      mode,
      requestTime,
    );
  } else {
    result = {
      rows: await listInvocationsFromInvocationStatusAndState(
        this,
        filters,
        sort,
        mode,
        requestTime,
      ),
    };
  }

  if ('error' in result) return badRequest(result.error);
  const isPartial = mode.type === 'sampled' || Boolean(result.partial);

  return Response.json({
    rows: result.rows,
    limit: INVOCATIONS_V2_LIMIT,
    mode: mode.type,
    isPartial,
    ...(result.partial && { partial: result.partial }),
    ...(mode.type === 'sampled' && {
      sample: {
        sampleSize: mode.sampleSize,
      },
    }),
  } satisfies ListInvocationsV2Response);
}
