import type { FilterItem } from '@restate/data-access/admin-api-spec';

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
