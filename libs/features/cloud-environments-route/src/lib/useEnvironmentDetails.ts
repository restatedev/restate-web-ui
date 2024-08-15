import { cloudApi, Environment } from '@restate/data-access/cloud/api-client';
import {
  useEnvironmentParam,
  useAccountParam,
} from '@restate/features/cloud/routes-utils';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export function useEnvironmentDetails({
  environmentId,
  ...options
}: Omit<UseQueryOptions<Environment>, 'queryKey' | 'queryFn'> & {
  environmentId?: string;
} = {}) {
  const currentEnvironmentId = useEnvironmentParam();
  const accountId = useAccountParam();
  const queryEnvironmentParam = environmentId ?? currentEnvironmentId;

  const environmentDetails = useQuery({
    ...cloudApi.describeEnvironment({
      accountId: String(accountId),
      environmentId: String(queryEnvironmentParam),
    }),
    refetchOnMount: false,
    enabled: Boolean(accountId && queryEnvironmentParam),
    ...options,
  });

  return environmentDetails;
}
