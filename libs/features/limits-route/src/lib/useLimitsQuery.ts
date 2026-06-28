import { FilterItem } from '@restate/data-access/admin-api-spec';
import {
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
  QueryClauseValue,
  useQueryBuilder,
} from '@restate/ui/query-builder';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { QuickFilterPreset } from './limitsSchema';

export type LimitSort = { field: string; order: 'ASC' | 'DESC' };
export type LimitsQueryKind = 'counter' | 'target';

// Counter (All) tab and target tabs keep independent filter/sort state in the
// URL so switching tab kinds never carries one schema's clauses into the other.
// Target params are shared across all match tabs (same schema) on purpose.
const PREFIX: Record<LimitsQueryKind, { filter: string; sort: string }> = {
  counter: { filter: 'cf_', sort: 'csort_' },
  target: { filter: 'tf_', sort: 'tsort_' },
};

function filterParamKey(
  prefix: string,
  param: QueryClause<QueryClauseType> | QueryClauseSchema<QueryClauseType>,
): string {
  if ('fieldValue' in param) {
    return `${prefix}${param.fieldValue}`;
  }
  return `${prefix}${param.id}`;
}

function deriveClauses(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
  prefix: string,
): QueryClause<QueryClauseType>[] {
  return schema
    .filter((clause) => searchParams.get(filterParamKey(prefix, clause)))
    .map((clause) =>
      QueryClause.fromJSON(
        clause,
        searchParams.get(filterParamKey(prefix, clause))!,
      ),
    );
}

function deriveSort(
  searchParams: URLSearchParams,
  prefix: string,
  defaultSort: LimitSort,
): LimitSort {
  const field = searchParams.get(`${prefix}field`);
  const order = searchParams.get(`${prefix}order`);
  if (field && (order === 'ASC' || order === 'DESC')) {
    return { field, order };
  }
  return defaultSort;
}

function toFilterItem(clause: QueryClause<QueryClauseType>): FilterItem {
  return {
    field: clause.fieldValue,
    operation: clause.value.operation!,
    type: clause.type,
    value: clause.value.value,
  } as FilterItem;
}

// Serialize a clause to its URL value. Unlike QueryClause.toString this keeps a
// numeric 0 (the builder otherwise treats 0 as "empty"), so `> 0` / `= 0`
// presets survive the round-trip. Returns undefined when there is no value.
function serializeClause(
  clause: QueryClause<QueryClauseType>,
): string | undefined {
  const { operation, value } = clause.value;
  if (operation && ['IS NULL', 'IS NOT NULL'].includes(operation)) {
    return JSON.stringify({ operation });
  }
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return JSON.stringify({ operation, value });
}

function isFilterClauseActive(clause: QueryClause<QueryClauseType>): boolean {
  return serializeClause(clause) !== undefined;
}

// URL-derived { filters, sort } for the data fetch. Re-runs whenever the URL
// changes, so the table's query key tracks it automatically.
export function useLimitsParameters(
  kind: LimitsQueryKind,
  schema: QueryClauseSchema<QueryClauseType>[],
  defaultSort: LimitSort,
) {
  const [searchParams] = useSearchParams();
  const searchString = searchParams.toString();
  return useMemo(() => {
    const sp = new URLSearchParams(searchString);
    const filters = deriveClauses(sp, schema, PREFIX[kind].filter)
      .filter(isFilterClauseActive)
      .map(toFilterItem);
    const sort = deriveSort(sp, PREFIX[kind].sort, defaultSort);
    return { filters, sort };
  }, [searchString, schema, kind, defaultSort.field, defaultSort.order]);
}

// Signature of one kind's URL params — used as a `key` so the form remounts and
// snaps to the URL whenever it changes externally (tab switch, quick filter).
export function getLimitsFormSignature(
  searchParams: URLSearchParams,
  kind: LimitsQueryKind,
): string {
  const { filter, sort } = PREFIX[kind];
  return Array.from(searchParams.entries())
    .filter(([key]) => key.startsWith(filter) || key.startsWith(sort))
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

// Apply a quick-filter preset to the URL for one tab kind: replace that kind's
// filter params with the preset's clauses and set/clear its sort.
export function buildQuickFilterParams(
  searchParams: URLSearchParams,
  kind: LimitsQueryKind,
  schema: QueryClauseSchema<QueryClauseType>[],
  preset: QuickFilterPreset,
): URLSearchParams {
  const { filter, sort } = PREFIX[kind];
  const next = new URLSearchParams(searchParams);
  Array.from(next.keys())
    .filter((key) => key.startsWith(filter))
    .forEach((key) => next.delete(key));
  preset.filters.forEach(({ field, operation, value }) => {
    const clauseSchema = schema.find((clause) => clause.id === field);
    if (!clauseSchema) return;
    const clause = new QueryClause(clauseSchema, {
      operation,
      value: value as QueryClauseValue<QueryClauseType>,
    });
    const serialized = serializeClause(clause);
    if (serialized) {
      next.set(filterParamKey(filter, clause), serialized);
    }
  });
  if (preset.sort) {
    next.set(`${sort}field`, preset.sort.field);
    next.set(`${sort}order`, preset.sort.order);
  } else {
    next.delete(`${sort}field`);
    next.delete(`${sort}order`);
  }
  return next;
}

// Form state for the query bar. Editing the form does not change the URL until
// commitQuery() runs (the "Query" submit), matching the invocations bar.
export function useLimitsForm({
  kind,
  schema,
  defaultSort,
}: {
  kind: LimitsQueryKind;
  schema: QueryClauseSchema<QueryClauseType>[];
  defaultSort: LimitSort;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortParams, setSortParams] = useState<LimitSort>(() =>
    deriveSort(searchParams, PREFIX[kind].sort, defaultSort),
  );

  const initialClauses = useMemo(
    () => deriveClauses(searchParams, schema, PREFIX[kind].filter),
    [searchParams, schema, kind],
  );

  const query = useQueryBuilder(initialClauses, false);

  const commitQuery = () => {
    const { filter, sort } = PREFIX[kind];
    const next = new URLSearchParams(searchParams);
    Array.from(next.keys())
      .filter((key) => key.startsWith(filter))
      .forEach((key) => next.delete(key));
    query.items.forEach((item) => {
      const serialized = serializeClause(item);
      if (serialized) {
        next.set(filterParamKey(filter, item), serialized);
      }
    });
    next.set(`${sort}field`, sortParams.field);
    next.set(`${sort}order`, sortParams.order);
    setSearchParams(next, { preventScrollReset: true });
  };

  return { query, sortParams, setSortParams, commitQuery };
}
