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
