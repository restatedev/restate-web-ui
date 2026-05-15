import { FilterItem } from '@restate/data-access/admin-api-spec';
import {
  components,
  SortInvocations,
} from '@restate/data-access/admin-api-spec';
import {
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
  useQueryBuilder,
} from '@restate/ui/query-builder';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSchema } from './useSchema';
import { COLUMN_QUERY_PREFIX, ColumnKey } from './columns';
import { setUserLastSort } from './userPreferences';

export const FILTER_QUERY_PREFIX = 'filter_';
export const SORT_QUERY_PREFIX = 'sort_';
export function getFilterParamKey(
  param: QueryClauseSchema<QueryClauseType> | QueryClause<QueryClauseType>,
) {
  if ('fieldValue' in param) {
    return `${FILTER_QUERY_PREFIX}${param.fieldValue}`;
  }
  return `${FILTER_QUERY_PREFIX}${param.id}`;
}

export const SORT_COLUMN_KEYS: ColumnKey[] = [
  'created_at',
  'modified_at',
  'scheduled_at',
  'scheduled_start_at',
  'running_at',
  'next_retry_at',
  'target_service_key',
  'target_service_name',
  'target_handler_name',
  'retry_count',
  'duration',
] as const;

export function isSortValid(searchParams: URLSearchParams) {
  const field = searchParams.get(SORT_QUERY_PREFIX + 'field') as ColumnKey;
  const order = searchParams.get(SORT_QUERY_PREFIX + 'order') || '';
  return (
    SORT_COLUMN_KEYS.includes(field) && ['ASC', 'DESC'].includes(String(order))
  );
}

export function setSort(
  searchParams: URLSearchParams,
  sort: { field: ColumnKey; order: 'ASC' | 'DESC' },
) {
  searchParams.set(SORT_QUERY_PREFIX + 'field', sort.field);
  searchParams.set(SORT_QUERY_PREFIX + 'order', sort.order);

  return searchParams;
}

export function setDefaultSort(searchParams: URLSearchParams) {
  return setSort(searchParams, { field: 'modified_at', order: 'DESC' });
}

function deriveSortFromUrl(searchParams: URLSearchParams): SortInvocations {
  const field = searchParams.get(SORT_QUERY_PREFIX + 'field');
  const order = searchParams.get(SORT_QUERY_PREFIX + 'order');
  if (isSortValid(searchParams) && field && order) {
    return { field, order } as SortInvocations;
  }
  return { field: 'modified_at', order: 'DESC' };
}

function deriveClausesFromUrl(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
  isLoading: boolean,
) {
  const clauses = schema
    .filter((schemaClause) => searchParams.get(getFilterParamKey(schemaClause)))
    .map((schemaClause) =>
      QueryClause.fromJSON(
        schemaClause,
        searchParams.get(getFilterParamKey(schemaClause))!,
      ),
    );

  if (!clauses.some(({ id }) => id === 'status') && !isLoading) {
    const clauseSchema = schema.find(({ id }) => id === 'status');
    if (clauseSchema) {
      clauses.unshift(
        new QueryClause(clauseSchema, { operation: 'IN', value: [] }),
      );
    }
  }
  if (!clauses.some(({ id }) => id === 'target_service_name') && !isLoading) {
    const clauseSchema = schema.find(({ id }) => id === 'target_service_name');
    if (clauseSchema) {
      clauses.unshift(
        new QueryClause(clauseSchema, { operation: 'IN', value: [] }),
      );
    }
  }
  return clauses;
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
    components['schemas']['ListInvocationsRequestBody']
  >(() => {
    const searchParams = new URLSearchParams(searchString);
    const clauses = deriveClausesFromUrl(searchParams, schema, isLoading);
    const filters = clauses
      .filter((clause) => clause.isValid)
      .map(
        (clause) =>
          ({
            field: clause.fieldValue,
            operation: clause.value.operation!,
            type: clause.type,
            value: clause.value.value,
          }) as FilterItem,
      );
    const sort = deriveSortFromUrl(searchParams);
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
  resetPageIndex,
}: {
  schema: QueryClauseSchema<QueryClauseType>[];
  isLoading: boolean;
  selectedColumns: ColumnKey[];
  resetPageIndex: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [sortParams, _setSortParams] = useState<SortInvocations>(() =>
    deriveSortFromUrl(searchParams),
  );
  const sortManuallyChangedRef = useRef(false);
  const setSortParams = useCallback<typeof _setSortParams>((value) => {
    sortManuallyChangedRef.current = true;
    _setSortParams(value);
  }, []);

  // Re-derived when isLoading flips so default status / target_service_name
  // chips get seeded once the schema is ready. URL changes are handled via
  // the parent re-mount (`key`).
  const initialClauses = useMemo(
    () => deriveClausesFromUrl(searchParams, schema, isLoading),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, schema],
  );

  const query = useQueryBuilder(initialClauses, isLoading);

  const commitQuery = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    Array.from(newSearchParams.keys())
      .filter((key) => key.startsWith(FILTER_QUERY_PREFIX))
      .forEach((key) => newSearchParams.delete(key));
    query.items
      .filter((clause) => clause.isValid)
      .forEach((item) => {
        newSearchParams.set(getFilterParamKey(item), String(item));
      });

    newSearchParams.delete(COLUMN_QUERY_PREFIX);
    selectedColumns.forEach((col) => {
      newSearchParams.append(COLUMN_QUERY_PREFIX, String(col));
    });

    const field = sortParams?.field || 'modified_at';
    const order = sortParams?.order || 'DESC';
    newSearchParams.set(SORT_QUERY_PREFIX + 'field', field);
    newSearchParams.set(SORT_QUERY_PREFIX + 'order', order);
    if (sortManuallyChangedRef.current) {
      setUserLastSort({ field, order });
      sortManuallyChangedRef.current = false;
    }
    const sortedNewSearchParams = new URLSearchParams(newSearchParams);
    sortedNewSearchParams.sort();
    const sortedOldSearchParams = new URLSearchParams(searchParams);
    sortedOldSearchParams.sort();

    if (sortedOldSearchParams.toString() !== sortedNewSearchParams.toString()) {
      resetPageIndex();
    }
    setSearchParams(newSearchParams, { preventScrollReset: true });

    return query.items
      .filter((clause) => clause.isValid)
      .map(
        (clause) =>
          ({
            field: clause.fieldValue,
            operation: clause.value.operation!,
            type: clause.type,
            value: clause.value.value,
          }) as FilterItem,
      );
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
