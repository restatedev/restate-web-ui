import type { FilterItem } from '@restate/data-access/admin-api-spec';

const FAILED_SUBSTATES = ['failed', 'cancelled', 'killed'];

// `status` is a STRING_LIST filter — narrow to that variant so we can read
// `.value` as string[] without crawling the FilterItem discriminated union.
export type StatusFilter =
  | Extract<FilterItem, { type: 'STRING_LIST' }>
  | undefined;

// Predicates over the parsed `status` filter clause (from
// useListInvocationsParameters) so the bar + legend can mirror the data
// fetch's view of the filter without re-parsing the URL.
//
// Mirrors the server's `expandStatus(s).some(matchers.status)` predicate in
// libs/data-access/query/src/lib/handlers/summaryInvocations.ts — IN filters
// pass when any substate of the status is in the value list; NOT_IN filters
// pass when any substate is NOT in the exclusion list. The compound 'failed'
// status expands to ['failed', 'cancelled', 'killed'] in both directions.

export function isStatusInFilter(filter: StatusFilter, statusName: string) {
  if (!filter || filter.value.length === 0) return false;
  const substates = statusName === 'failed' ? FAILED_SUBSTATES : [statusName];
  if (filter.operation === 'IN') {
    return substates.some((s) => filter.value.includes(s));
  }
  if (filter.operation === 'NOT_IN') {
    return substates.some((s) => !filter.value.includes(s));
  }
  return false;
}

// True when the status filter has at least one user-selected value (either
// IN or NOT_IN). Empty value array is still treated as no filter — that
// shape can appear via the QueryBuilder while the user is editing a clause
// before settling on a value.
export function hasStatusFilter(filter: StatusFilter) {
  return Boolean(filter && filter.value.length > 0);
}

// True iff the current filter is exactly `IN [statusName]` (no other values).
// Drives the toggle-off behavior on segment click — clicking the single
// selected status clears it; clicking anything else REPLACES with IN
// [clicked] (including breaking out of a NOT_IN filter).
export function isSingleStatusSelection(
  filter: StatusFilter,
  statusName: string,
) {
  if (!filter || filter.operation !== 'IN') return false;
  const substates = statusName === 'failed' ? FAILED_SUBSTATES : [statusName];
  return (
    filter.value.length === substates.length &&
    substates.every((s) => filter.value.includes(s))
  );
}

export { FAILED_SUBSTATES };
