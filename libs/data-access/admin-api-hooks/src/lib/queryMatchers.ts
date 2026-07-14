import type {
  QueryCacheNotifyEvent,
  Query,
  QueryClient,
} from '@tanstack/react-query';

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

export function isInvocationsV2Query(
  query: Query | QueryCacheNotifyEvent['query'],
): boolean {
  const queryPath = Array.isArray(query.queryKey)
    ? query.queryKey[0]
    : undefined;
  return (
    (typeof query.meta?.['path'] === 'string' &&
      query.meta['path'].startsWith('/query/v2/invocations')) ||
    (typeof queryPath === 'string' &&
      queryPath.startsWith('/query/v2/invocations'))
  );
}

export function invalidateInvocationsV2Queries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    refetchType: 'active',
    predicate: isInvocationsV2Query,
  });
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
