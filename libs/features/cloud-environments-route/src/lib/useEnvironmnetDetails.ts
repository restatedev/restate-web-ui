import { cloudApi, Environment } from '@restate/data-access/cloud/api-client';
import {
  useEnvironmentParam,
  useAccountParam,
} from '@restate/features/cloud/routes-utils';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export function useEnvironmentDetails(
  options?: Omit<UseQueryOptions<Environment>, 'queryKey' | 'queryFn'>
) {
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();

  const environmentDetails = useQuery({
    ...cloudApi.describeEnvironment({
      accountId: String(accountId),
      environmentId: String(environmentId),
    }),
    refetchOnMount: false,
    enabled: Boolean(accountId && environmentId),
    ...options,
  });

  return environmentDetails;
}
