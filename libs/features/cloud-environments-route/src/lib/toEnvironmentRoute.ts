import type {
  Account,
  Environment,
} from '@restate/data-access/cloud-api-client';

export function toEnvironmentRoute(
  accountId: string,
  environment: Environment
) {
  return `/accounts/${accountId}/environments/${environment.environmentId}`;
}
