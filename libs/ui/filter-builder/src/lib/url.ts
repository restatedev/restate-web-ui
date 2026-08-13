import {
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/query-builder';

export const FILTER_QUERY_PREFIX = 'filter_';

export function getFilterParamKey(
  param: QueryClauseSchema<QueryClauseType> | QueryClause<QueryClauseType>,
) {
  if ('fieldValue' in param) {
    return `${FILTER_QUERY_PREFIX}${param.fieldValue}`;
  }
  return `${FILTER_QUERY_PREFIX}${param.id}`;
}

export function readFilterClauses(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
) {
  return schema.flatMap((schemaClause) => {
    const value = searchParams.get(getFilterParamKey(schemaClause));
    return value ? [QueryClause.fromJSON(schemaClause, value)] : [];
  });
}

export function writeFilterClauses(
  searchParams: URLSearchParams,
  clauses: QueryClause<QueryClauseType>[],
) {
  const nextSearchParams = new URLSearchParams(searchParams);
  Array.from(nextSearchParams.keys())
    .filter((key) => key.startsWith(FILTER_QUERY_PREFIX))
    .forEach((key) => nextSearchParams.delete(key));
  clauses
    .filter((clause) => clause.isValid)
    .forEach((clause) => {
      nextSearchParams.set(getFilterParamKey(clause), String(clause));
    });
  return nextSearchParams;
}
