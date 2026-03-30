import { useQuery } from '@tanstack/react-query';
import { useAdminBaseUrl } from '../AdminBaseUrlProvider';
import { adminApi } from './client';
import { HookQueryOptions } from './hookTypes';

export function useVersion(options?: HookQueryOptions<'/version', 'get'>) {
  const baseUrl = useAdminBaseUrl();

  return useQuery({
    ...adminApi('query', '/version', 'get', { baseUrl }),
    ...options,
  });
}
export function useHealth(options?: HookQueryOptions<'/health', 'get'>) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/health', 'get', { baseUrl });
  return useQuery({
    ...queryOptions,
    ...options,
  });
}

const QUERY_HEALTH_META_TAG = 'query-health-check';

export function getQueryHealthCheckMeta() {
  return { [QUERY_HEALTH_META_TAG]: true };
}

export function useQueryHealthCheck(
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/query', 'post', {
    baseUrl,
    body: { query: 'SELECT 1 FROM sys_invocation LIMIT 1' },
  });

  return useQuery({
    ...queryOptions,
    ...options,
    meta: {
      ...queryOptions.meta,
      ...getQueryHealthCheckMeta(),
    },
    retry: false,
  });
}
