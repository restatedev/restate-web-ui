import {
  INVOCATION_STATUS_DEFINITIONS,
  INVOCATION_STATUSES,
  TERMINAL_INVOCATION_STATUSES,
  type FilterItem,
} from '@restate/data-access-admin-api-spec';
import type { VQueueSummaryFocus } from '@restate/features-status-chart';

// `status` is a STRING_LIST filter — narrow to that variant so we can read
// `.value` as string[] without crawling the FilterItem discriminated union.
export type StatusFilter =
  | Extract<FilterItem, { type: 'STRING_LIST' }>
  | undefined;

// True when the status filter has at least one user-selected value (either
// IN or NOT_IN). Empty value array is still treated as no filter — that
// shape can appear via the QueryBuilder while the user is editing a clause
// before settling on a value.
export function hasStatusFilter(
  filter: StatusFilter,
): filter is Exclude<StatusFilter, undefined> {
  return Boolean(filter && filter.value.length > 0);
}

function countMatchingStatuses(statusFilter: Exclude<StatusFilter, undefined>) {
  const values = new Set(statusFilter.value);
  const counts = { completed: 0, notCompleted: 0 };
  for (const { key, stage } of INVOCATION_STATUS_DEFINITIONS) {
    const matches =
      statusFilter.operation === 'IN' ? values.has(key) : !values.has(key);
    if (!matches) continue;
    if (stage === 'finished') counts.completed++;
    else counts.notCompleted++;
  }
  return counts;
}

export function getFocusFromStatusFilter(
  statusFilter: StatusFilter,
): VQueueSummaryFocus {
  if (!hasStatusFilter(statusFilter)) return 'all';

  const { completed, notCompleted } = countMatchingStatuses(statusFilter);
  const includesCompleted = completed > 0;
  const includesNotCompleted = notCompleted > 0;
  if (includesCompleted === includesNotCompleted) return 'all';
  return includesCompleted ? 'completed' : 'not-completed';
}

export function getSelectedFocusFromStatusFilter(
  statusFilter: StatusFilter,
): VQueueSummaryFocus | null {
  if (!hasStatusFilter(statusFilter)) return 'all';

  const { completed, notCompleted } = countMatchingStatuses(statusFilter);
  const hasAllCompleted = completed === TERMINAL_INVOCATION_STATUSES.length;
  const hasAllNotCompleted =
    notCompleted ===
    INVOCATION_STATUSES.length - TERMINAL_INVOCATION_STATUSES.length;
  if (hasAllCompleted && hasAllNotCompleted) return 'all';
  if (hasAllCompleted && notCompleted === 0) return 'completed';
  if (hasAllNotCompleted && completed === 0) return 'not-completed';
  return null;
}
