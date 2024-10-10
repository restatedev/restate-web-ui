import { useParams } from '@remix-run/react';

export function useEnvironmentParam() {
  const params = useParams<{ environmentId: string }>();
  return params.environmentId;
}

export function toEnvironmentRoute(
  accountId: string,
  environmentId: string,
  relativePath = ''
) {
  return `/accounts/${accountId}/environments/${environmentId}${relativePath}`;
}
