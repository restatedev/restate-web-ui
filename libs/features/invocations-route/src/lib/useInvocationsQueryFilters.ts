import { FilterItem } from '@restate/data-access/admin-api';
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
import { useCallback, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router';
import { useSchema } from './useSchema';
import { COLUMN_QUERY_PREFIX, ColumnKey } from './columns';

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

export function useInvocationsQueryFilters(selectedColumns: ColumnKey[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortParams, setSortParams] = useState<SortInvocations>(() => {
    const field = searchParams.get(SORT_QUERY_PREFIX + 'field');
    const order = searchParams.get(SORT_QUERY_PREFIX + 'order');

    if (!field || !order) {
      return { field: 'modified_at', order: 'DESC' };
    }
    return {
      field,
      order,
    } as SortInvocations;
  });
  const { schema, isLoading } = useSchema();

  const queryClauses = schema
    // TODO
    .filter((schemaClause) => searchParams.get(getFilterParamKey(schemaClause)))
    .map((schemaClause) => {
      return QueryClause.fromJSON(
        schemaClause,
        searchParams.get(getFilterParamKey(schemaClause))!,
      );
    });

  if (!queryClauses.some(({ id }) => id === 'status') && !isLoading) {
    const clauseSchema = schema.find(({ id }) => id === 'status');
    clauseSchema &&
      queryClauses.unshift(
        new QueryClause(clauseSchema, {
          operation: 'IN',
          value: [],
        }),
      );
  }

  if (
    !queryClauses.some(({ id }) => id === 'target_service_name') &&
    !isLoading
  ) {
    const clauseSchema = schema.find(({ id }) => id === 'target_service_name');
    clauseSchema &&
      queryClauses.unshift(
        new QueryClause(clauseSchema, {
          operation: 'IN',
          value: [],
        }),
      );
  }

  const [listInvocationsParameters, _setListInvocationsParameters] = useState<
    components['schemas']['ListInvocationsRequestBody']
  >(() => {
    return {
      filters: queryClauses
        .filter((clause) => clause.isValid)
        .map((clause) => {
          return {
            field: clause.fieldValue,
            operation: clause.value.operation!,
            type: clause.type,
            value: clause.value.value,
          } as FilterItem;
        }),
      // TODO
      sort: sortParams,
    };
  });

  const query = useQueryBuilder(queryClauses, isLoading);
  const [pageIndex, _setPageIndex] = useState(0);
  const [, startTransition] = useTransition();

  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    [],
  );

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

    newSearchParams.set(
      SORT_QUERY_PREFIX + 'field',
      sortParams?.field || 'modified_at',
    );
    newSearchParams.set(
      SORT_QUERY_PREFIX + 'order',
      sortParams?.order || 'DESC',
    );
    const sortedNewSearchParams = new URLSearchParams(newSearchParams);
    sortedNewSearchParams.sort();
    const sortedOldSearchParams = new URLSearchParams(searchParams);
    sortedOldSearchParams.sort();

    if (sortedOldSearchParams.toString() !== sortedNewSearchParams.toString()) {
      setPageIndex(0);
    }
    setSearchParams(newSearchParams, { preventScrollReset: true });
    const filters = query.items
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

    _setListInvocationsParameters({ filters, sort: sortParams });

    return filters;
  };

  return {
    schema,
    listInvocationsParameters,
    commitQuery,
    query,
    pageIndex,
    setPageIndex,
    sortParams,
    setSortParams,
    isSchemaLoading: isLoading,
  };
}
