import type { QueryCacheNotifyEvent, Query } from '@tanstack/react-query';

const QUERY_HEALTH_META_TAG = 'query-health-check';

export function isQueryForPath(
  query: Query | QueryCacheNotifyEvent['query'],
  path: string,
  method: string,
): boolean {
  return query.meta?.['path'] === path && query.meta?.['method'] === method;
}

export function isDeploymentsQuery(event: QueryCacheNotifyEvent): boolean {
  return isQueryForPath(event.query, '/deployments', 'get');
}

export function isSummaryInvocationsQuery(
  query: Query | QueryCacheNotifyEvent['query'],
): boolean {
  return isQueryForPath(query, '/query/invocations/summary', 'post');
}

export function isQueryHealthCheckQuery(event: QueryCacheNotifyEvent): boolean {
  return event.query.meta?.[QUERY_HEALTH_META_TAG] === true;
}

export function findSuccessfulQueryData<T>(
  queries: Query[],
  path: string,
  method: string,
): T | undefined {
  for (const query of queries) {
    if (
      isQueryForPath(query, path, method) &&
      query.state.status === 'success' &&
      query.state.data
    ) {
      return query.state.data as T;
    }
  }
  return undefined;
}
