import * as cloudApi from './api';
import apiClient from './client';

type RemovePropsWithNeverType<O> = {
  [K in keyof O as O[K] extends never ? never : K]: O[K];
};

type AllParams<
  Operation extends {
    parameters?: { path: unknown };
    requestBody?: { content: { 'application/json'?: unknown } };
    responses?: unknown;
  }
> = NonNullable<Operation['parameters']>['path'] &
  RemovePropsWithNeverType<
    NonNullable<Operation['requestBody']>['content']['application/json']
  >;

export async function getUserIdentity() {
  return apiClient.POST('/GetUserIdentity');
}

export async function createAccount(
  params: AllParams<cloudApi.operations['CreateAccount']>
) {
  return apiClient.POST('/CreateAccount', {
    body: { description: params.description },
  });
}

export async function listAccounts() {
  return apiClient.POST('/ListAccounts');
}

export async function describeEnvironment(
  params: AllParams<cloudApi.operations['DescribeEnvironment']>
) {
  return apiClient.POST('/{accountId}/DescribeEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}

export async function destroyEnvironment(
  params: AllParams<cloudApi.operations['DestroyEnvironment']>
) {
  return apiClient.POST('/{accountId}/DestroyEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}

export async function createEnvironment(
  params: AllParams<cloudApi.operations['CreateEnvironment']>
) {
  return apiClient.POST('/{accountId}/CreateEnvironment', {
    params: { path: { accountId: params.accountId } },
    body: { description: params.description },
  });
}

export async function listEnvironments(
  params: AllParams<cloudApi.operations['ListEnvironments']>
) {
  return apiClient.POST('/{accountId}/ListEnvironments', {
    params: { path: { accountId: params.accountId } },
  });
}

export async function createApiKey(
  params: AllParams<cloudApi.operations['CreateApiKey']>
) {
  return apiClient.POST('/{accountId}/CreateApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      roleId: params.roleId,
      environmentId: params.environmentId,
    },
  });
}

export async function describeApiKey(
  params: AllParams<cloudApi.operations['DescribeApiKey']>
) {
  return apiClient.POST('/{accountId}/DescribeApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      keyId: params.keyId,
      environmentId: params.environmentId,
    },
  });
}

export async function deleteApiKey(
  params: AllParams<cloudApi.operations['DeleteApiKey']>
) {
  return apiClient.POST('/{accountId}/DeleteApiKey', {
    params: { path: { accountId: params.accountId } },
    body: {
      keyId: params.keyId,
      environmentId: params.environmentId,
    },
  });
}

export async function listApiKeys(
  params: AllParams<cloudApi.operations['ListApiKeys']>
) {
  return apiClient.POST('/{accountId}/ListApiKeys', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
    },
  });
}

export async function getEnvironmentLogs(
  params: AllParams<cloudApi.operations['GetEnvironmentLogs']>
) {
  return apiClient.POST('/{accountId}/GetEnvironmentLogs', {
    params: { path: { accountId: params.accountId } },
    body: {
      environmentId: params.environmentId,
      start: params.start,
      end: params.end,
    },
  });
}
