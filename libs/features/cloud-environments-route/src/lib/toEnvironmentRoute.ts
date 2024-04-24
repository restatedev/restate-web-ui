import type { Environment } from '@restate/data-access/cloud/api-client';

export function toEnvironmentRoute(
  accountId: string,
  environment: Pick<Environment, 'environmentId'>
) {
  return `/accounts/${accountId}/environments/${environment.environmentId}`;
}
