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

const STATE_STATS_PATHS = new Set([
  '/query/virtual-objects/{service}/instances/{key}/stats',
  '/query/workflows/{service}/runs/{workflowId}/stats',
]);

function pathParameters(
  query: Query | QueryCacheNotifyEvent['query'],
): Record<string, unknown> {
  const [, options] = Array.isArray(query.queryKey) ? query.queryKey : [];
  return (
    (options as { parameters?: { path?: Record<string, unknown> } })?.parameters
      ?.path ?? {}
  );
}

export function isServiceStateQuery(
  query: Query | QueryCacheNotifyEvent['query'],
  service: string,
): boolean {
  const path = query.meta?.['path'];
  return (
    typeof path === 'string' &&
    path.startsWith('/query/services/{name}/') &&
    path.includes('/state') &&
    pathParameters(query)['name'] === service
  );
}

export function isStateQuery(
  query: Query | QueryCacheNotifyEvent['query'],
  service: string,
  key: string,
): boolean {
  if (isServiceStateQuery(query, service)) {
    return true;
  }
  const path = query.meta?.['path'];
  if (typeof path !== 'string' || !STATE_STATS_PATHS.has(path)) {
    return false;
  }
  const params = pathParameters(query);
  return (
    params['service'] === service &&
    (params['key'] ?? params['workflowId']) === key
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
