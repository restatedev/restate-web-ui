import { components } from '@restate/data-access/admin-api-spec';
import {
  FILTER_QUERY_PREFIX,
  QueryClauseSchema,
  QueryClauseType,
  readFilterClauses,
  useFilterBuilder,
  writeFilterClauses,
} from '@restate/ui/filter-builder';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSchema } from './useSchema';
import { COLUMN_QUERY_PREFIX, ColumnKey } from './columns';
import { setUserLastSort } from './userPreferences';
import { useInvocationsLastQuery } from '@restate/util/sidebar-nav';

export const SORT_QUERY_PREFIX = 'sort_';

type InvocationV2Filter = components['schemas']['InvocationV2FilterItem'];
type InvocationV2Sort = components['schemas']['InvocationV2Sort'];

export const SORT_COLUMN_KEYS = [
  'created_at',
] as const satisfies readonly InvocationV2Sort['field'][];
type InvocationUiSortField = (typeof SORT_COLUMN_KEYS)[number];

// Sentinel sort field meaning "don't sort": the list query then omits its
// ORDER BY and returns rows in scan order (fastest, but unstable order).
export const SORT_NONE = 'none';
export type SortSelection = {
  field: InvocationUiSortField | typeof SORT_NONE;
  order: InvocationV2Sort['order'];
};

export function isNoSort(searchParams: URLSearchParams) {
  return searchParams.get(SORT_QUERY_PREFIX + 'field') === SORT_NONE;
}

export function isSortValid(searchParams: URLSearchParams) {
  const field = searchParams.get(
    SORT_QUERY_PREFIX + 'field',
  ) as InvocationV2Sort['field'];
  const order = searchParams.get(SORT_QUERY_PREFIX + 'order') || '';
  return (
    SORT_COLUMN_KEYS.some((sortField) => sortField === field) &&
    ['ASC', 'DESC'].includes(String(order))
  );
}

export function setSort(searchParams: URLSearchParams, sort: InvocationV2Sort) {
  searchParams.set(SORT_QUERY_PREFIX + 'field', sort.field);
  searchParams.set(SORT_QUERY_PREFIX + 'order', sort.order);

  return searchParams;
}

export function setDefaultSort(searchParams: URLSearchParams) {
  return setSort(searchParams, { field: 'created_at', order: 'DESC' });
}

function deriveSortFromUrl(searchParams: URLSearchParams): SortSelection {
  if (isNoSort(searchParams)) {
    return { field: SORT_NONE, order: 'DESC' };
  }
  const field = searchParams.get(SORT_QUERY_PREFIX + 'field');
  const order = searchParams.get(SORT_QUERY_PREFIX + 'order');
  if (isSortValid(searchParams) && field && order) {
    return { field, order } as SortSelection;
  }
  return { field: 'created_at', order: 'DESC' };
}

/**
 * URL-derived list parameters for the data fetch. Pure: re-runs whenever
 * the URL or schema change. The data fetch (and its query key) tracks the
 * URL automatically.
 */
export function useListInvocationsParameters() {
  const [searchParams] = useSearchParams();
  const { schema, isLoading } = useSchema();
  const searchString = searchParams.toString();

  const listInvocationsParameters = useMemo<
    Omit<components['schemas']['ListInvocationsV2RequestBody'], 'mode'>
  >(() => {
    const searchParams = new URLSearchParams(searchString);
    const clauses = readFilterClauses(searchParams, schema);
    const filters = clauses.flatMap((clause) => {
      if (!clause.isValid || !clause.value.operation) return [];
      return [
        {
          field: clause.fieldValue,
          operation: clause.value.operation,
          type: clause.type,
          value: clause.value.value,
        } as InvocationV2Filter,
      ];
    });
    const selection = deriveSortFromUrl(searchParams);
    const sort =
      selection.field === SORT_NONE
        ? undefined
        : (selection as InvocationV2Sort);
    return { filters, sort };
  }, [searchString, schema, isLoading]);

  return { schema, isLoading, listInvocationsParameters };
}

/**
 * Form state for the invocations query toolbar. Initial state is derived
 * from the URL on mount; callers should re-mount this hook (via a `key`
 * keyed off the URL) so the form snaps to the current URL whenever it
 * changes externally (e.g. sidebar navigation). Editing inside the form
 * does not change the URL until `commitQuery` is called.
 */
export function useInvocationsForm({
  schema,
  isLoading,
  selectedColumns,
}: {
  schema: QueryClauseSchema<QueryClauseType>[];
  isLoading: boolean;
  selectedColumns: ColumnKey[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveLastQuery } = useInvocationsLastQuery();

  const [sortParams, _setSortParams] = useState<SortSelection>(() =>
    deriveSortFromUrl(searchParams),
  );
  const sortManuallyChangedRef = useRef(false);
  const setSortParams = useCallback<typeof _setSortParams>((value) => {
    sortManuallyChangedRef.current = true;
    _setSortParams(value);
  }, []);

  // Re-derived when isLoading flips so the form picks up the URL state once
  // the schema is ready (chips depend on schema options). URL changes after
  // mount are handled by the parent re-mounting via `key`.
  const initialClauses = useMemo(
    () => readFilterClauses(searchParams, schema),
    [isLoading, schema],
  );

  const query = useFilterBuilder(initialClauses, isLoading);

  const commitQuery = () => {
    const newSearchParams = writeFilterClauses(searchParams, query.items);

    newSearchParams.delete(COLUMN_QUERY_PREFIX);
    selectedColumns.forEach((col) => {
      newSearchParams.append(COLUMN_QUERY_PREFIX, String(col));
    });

    if (sortParams.field === SORT_NONE) {
      newSearchParams.set(SORT_QUERY_PREFIX + 'field', SORT_NONE);
      newSearchParams.delete(SORT_QUERY_PREFIX + 'order');
      sortManuallyChangedRef.current = false;
    } else {
      const field = sortParams.field;
      const order = sortParams.order;
      newSearchParams.set(SORT_QUERY_PREFIX + 'field', field);
      newSearchParams.set(SORT_QUERY_PREFIX + 'order', order);
      if (sortManuallyChangedRef.current) {
        setUserLastSort({ field, order });
        sortManuallyChangedRef.current = false;
      }
    }
    const sortedNewSearchParams = new URLSearchParams(newSearchParams);
    sortedNewSearchParams.sort();
    const sortedOldSearchParams = new URLSearchParams(searchParams);
    sortedOldSearchParams.sort();

    const changed =
      sortedOldSearchParams.toString() !== sortedNewSearchParams.toString();

    // Nothing to apply (e.g. opening then closing a filter chip without an
    // edit): leave the URL untouched and report no change. The caller decides
    // whether to still refetch (explicit Query press) or skip it (auto-submit
    // on close).
    if (!changed) {
      return false;
    }

    // Keep lastQuery in sync with the committed state so the next "Back to
    // invocations" navigation (?restore=1) restores what the user actually
    // just submitted. Saving here is a hot-path optimization — the route's
    // useEffect saves on URL change as well.
    saveLastQuery(newSearchParams);
    setSearchParams(newSearchParams, { preventScrollReset: true });

    return true;
  };

  return {
    query,
    sortParams,
    setSortParams,
    commitQuery,
  };
}

export function getFormUrlSignature(searchParams: URLSearchParams) {
  return Array.from(searchParams.entries())
    .filter(
      ([key]) =>
        key.startsWith(FILTER_QUERY_PREFIX) ||
        key.startsWith(SORT_QUERY_PREFIX),
    )
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
