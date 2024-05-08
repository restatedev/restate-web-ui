import type { Environment } from '@restate/data-access/cloud/api-client';
import { useParams } from '@remix-run/react';

export function useEnvironmentParam() {
  const params = useParams<{ environmentId: string }>();
  return params.environmentId;
}

export function toEnvironmentRoute(
  accountId: string,
  environment: Pick<Environment, 'environmentId'>
) {
  return `/accounts/${accountId}/environments/${environment.environmentId}`;
}
