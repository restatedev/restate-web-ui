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

export async function createAccount(
  params: AllParams<cloudApi.operations['createAccount']>
) {
  return apiClient.POST('/cloud/CreateAccount', {
    body: { description: params.description },
  });
}

export async function listAccounts() {
  return apiClient.POST('/cloud/ListAccounts');
}

export async function describeEnvironment(
  params: AllParams<cloudApi.operations['describeEnvironment']>
) {
  return apiClient.POST('/cloud/{accountId}/DescribeEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}

export async function destroyEnvironment(
  params: AllParams<cloudApi.operations['destroyEnvironment']>
) {
  return apiClient.POST('/cloud/{accountId}/DestroyEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}

type b = AllParams<cloudApi.operations['listAccounts']>;

export async function createEnvironment(
  params: AllParams<cloudApi.operations['createEnvironment']>
) {
  return apiClient.POST('/cloud/{accountId}/CreateEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: { description: params.description },
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

export async function describeApiKey(
  params: AllParams<cloudApi.operations['describeApiKey']>
) {
  return apiClient.POST('/cloud/{accountId}/DescribeApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      keyId: params.keyId,
      environmentId: params.environmentId,
    },
  });
}

export async function deleteApiKey(
  params: AllParams<cloudApi.operations['deleteApiKey']>
) {
  return apiClient.POST('/cloud/{accountId}/DeleteApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      keyId: params.keyId,
      environmentId: params.environmentId,
    },
  });
}

export async function listApiKeys(
  params: AllParams<cloudApi.operations['listApiKeys']>
) {
  return apiClient.POST('/cloud/{accountId}/ListApiKeys', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}
