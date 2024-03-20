import * as cloudApi from './api';
import apiClient from './client';

type AllParams<
  Operation extends {
    parameters?: { path: unknown };
    requestBody?: { content: { 'application/json'?: unknown } };
    responses?: unknown;
  }
> = NonNullable<Operation['parameters']>['path'] &
  NonNullable<Operation['requestBody']>['content']['application/json'];

export async function getUserIdentity() {
  return apiClient.POST('/cloud/GetUserIdentity');
}

export async function createAccount() {
  return apiClient.POST('/cloud/CreateAccount');
}

export async function listAccounts() {
  return apiClient.POST('/cloud/ListAccounts');
}

type b = AllParams<cloudApi.operations['listAccounts']>;

export async function createEnvironment(
  params: AllParams<cloudApi.operations['createEnvironment']>
) {
  return apiClient.POST('/cloud/{accountId}/CreateEnvironment', {
    params: { path: { accountId: params.accountId } },
  });
}

export async function listEnvironments(
  params: AllParams<cloudApi.operations['listEnvironments']>
) {
  return apiClient.POST('/cloud/{accountId}/ListEnvironments', {
    params: { path: { accountId: params.accountId } },
  });
}

export async function createApiKey(
  params: AllParams<cloudApi.operations['createApiKey']>
) {
  return apiClient.POST('/cloud/{accountId}/CreateApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      roleId: params.roleId,
      environmentId: params.environmentId,
    },
  });
}
