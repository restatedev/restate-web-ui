import * as cloudApi from '@restate/data-access/cloud-api-client';
import { http, HttpResponse } from 'msw';
import { cloudApiDb } from './cloudApiDb';

type FormatParameterWithColon<S extends string> =
  S extends `${infer A}{${infer P}}${infer B}` ? `${A}:${P}${B}` : S;
type GetPath<S extends keyof cloudApi.paths> = FormatParameterWithColon<
  keyof Pick<cloudApi.paths, S>
>;

const getUserIdentityHandler = http.post<
  never,
  never,
  | cloudApi.operations['getUserIdentity']['responses']['200']['content']['application/json']
  | cloudApi.operations['getUserIdentity']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/GetUserIdentity'>
>('/cloud/GetUserIdentity', async () => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  return HttpResponse.json({
    userId: user.userId,
  });
});

const createAccountHandler = http.post<
  never,
  cloudApi.operations['createAccount']['requestBody']['content']['application/json'],
  | cloudApi.operations['createAccount']['responses']['200']['content']['application/json']
  | cloudApi.operations['createAccount']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/CreateAccount'>
>('/cloud/CreateAccount', async ({ request }) => {
  const user = cloudApiDb.user.getAll().at(0);
  const requestBody = await request.json();

  if (!user) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const account = cloudApiDb.account.create({
    users: [user],
    description: requestBody.description,
  });

  return HttpResponse.json({
    accountId: account.accountId,
  });
});

const listAccountsHandler = http.post<
  never,
  never,
  | cloudApi.operations['listAccounts']['responses']['200']['content']['application/json']
  | cloudApi.operations['listAccounts']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/ListAccounts'>
>('/cloud/ListAccounts', async () => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const accounts = cloudApiDb.account.findMany({
    where: {
      users: {
        userId: {
          equals: user.userId,
        },
      },
    },
  });

  return HttpResponse.json({
    accounts: accounts.map(({ accountId }) => ({ accountId })),
  });
});

const describeEnvironmentHandler = http.post<
  cloudApi.operations['describeEnvironment']['parameters']['path'],
  cloudApi.operations['describeEnvironment']['requestBody']['content']['application/json'],
  | cloudApi.operations['describeEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['describeEnvironment']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/DescribeEnvironment'>
>('/cloud/:accountId/DescribeEnvironment', async ({ request }) => {
  const requestBody = await request.json();

  const environment = cloudApiDb.environment.findFirst({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });

  if (!environment) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  return HttpResponse.json({
    environmentId: environment.environmentId,
    accountId: environment.account?.accountId,
    description: environment.description,
  });
});

const destroyEnvironmentHandler = http.post<
  cloudApi.operations['destroyEnvironment']['parameters']['path'],
  cloudApi.operations['destroyEnvironment']['requestBody']['content']['application/json'],
  | cloudApi.operations['destroyEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['destroyEnvironment']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/DestroyEnvironment'>
>('/cloud/:accountId/DestroyEnvironment', async ({ request }) => {
  const requestBody = await request.json();

  const environment = cloudApiDb.environment.findFirst({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });

  if (!environment) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  cloudApiDb.environment.delete({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });

  return HttpResponse.json({});
});

const createEnvironmentHandler = http.post<
  cloudApi.operations['createEnvironment']['parameters']['path'],
  cloudApi.operations['createEnvironment']['requestBody']['content']['application/json'],
  | cloudApi.operations['createEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['createEnvironment']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/CreateEnvironment'>
>('/cloud/:accountId/CreateEnvironment', async ({ params, request }) => {
  const account = cloudApiDb.account.findFirst({
    where: {
      accountId: {
        equals: params.accountId,
      },
    },
  });
  const requestBody = await request.json();

  if (!account) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const environment = cloudApiDb.environment.create({
    account,
    description: requestBody.description,
  });

  return HttpResponse.json({
    environmentId: environment.environmentId,
  });
});

const listEnvironmentsHandler = http.post<
  cloudApi.operations['listEnvironments']['parameters']['path'],
  never,
  | cloudApi.operations['listEnvironments']['responses']['200']['content']['application/json']
  | cloudApi.operations['listEnvironments']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/ListEnvironments'>
>('/cloud/:accountId/ListEnvironments', async ({ params }) => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const environments = cloudApiDb.environment.findMany({
    where: {
      account: {
        accountId: {
          equals: params.accountId,
        },
      },
    },
  });

  return HttpResponse.json({
    environments: environments.map(({ environmentId }) => ({ environmentId })),
  });
});

const createApiKeyHandler = http.post<
  cloudApi.operations['createApiKey']['parameters']['path'],
  cloudApi.operations['createApiKey']['requestBody']['content']['application/json'],
  | cloudApi.operations['createApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['createApiKey']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/CreateApiKey'>
>('/cloud/:accountId/CreateApiKey', async ({ params, request }) => {
  const requestBody = await request.json();
  const account = cloudApiDb.account.findFirst({
    where: {
      accountId: {
        equals: params.accountId,
      },
    },
  });
  const environment = cloudApiDb.environment.findFirst({
    where: {
      environmentId: {
        equals: requestBody.environmentId,
      },
    },
  });

  if (!account || !environment) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const apiKey = cloudApiDb.apiKey.create({
    account,
    environment,
    roleId: requestBody.roleId,
  });

  return HttpResponse.json({
    accountId: account.accountId,
    environmentId: environment.environmentId,
    roleId: apiKey.roleId,
    apiKey: apiKey.apiKey,
    state: apiKey.state,
    keyId: apiKey.keyId,
  });
});

const describeApiKeyHandler = http.post<
  cloudApi.operations['describeApiKey']['parameters']['path'],
  cloudApi.operations['describeApiKey']['requestBody']['content']['application/json'],
  | cloudApi.operations['describeApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['describeApiKey']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/DescribeApiKey'>
>('/cloud/:accountId/DescribeApiKey', async ({ params, request }) => {
  const requestBody = await request.json();
  const apiKey = cloudApiDb.apiKey.findFirst({
    where: {
      keyId: {
        equals: requestBody.keyId,
      },
    },
  });

  if (!apiKey) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  return HttpResponse.json({
    accountId: params.accountId,
    environmentId: requestBody.environmentId,
    roleId: apiKey.roleId,
    apiKey: apiKey.apiKey,
    state: apiKey.state,
    keyId: apiKey.keyId,
  });
});

const deleteApiKeyHandler = http.post<
  cloudApi.operations['deleteApiKey']['parameters']['path'],
  cloudApi.operations['deleteApiKey']['requestBody']['content']['application/json'],
  | cloudApi.operations['deleteApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['deleteApiKey']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/DeleteApiKey'>
>('/cloud/:accountId/DeleteApiKey', async ({ request }) => {
  const requestBody = await request.json();
  const apiKey = cloudApiDb.apiKey.findFirst({
    where: {
      keyId: {
        equals: requestBody.keyId,
      },
    },
  });

  if (!apiKey) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  return HttpResponse.json({});
});

const listApiKeysHandler = http.post<
  cloudApi.operations['listApiKeys']['parameters']['path'],
  cloudApi.operations['listApiKeys']['requestBody']['content']['application/json'],
  | cloudApi.operations['listApiKeys']['responses']['200']['content']['application/json']
  | cloudApi.operations['listApiKeys']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/ListApiKeys'>
>('/cloud/:accountId/ListApiKeys', async ({ request }) => {
  const requestBody = await request.json();
  const apiKeys = cloudApiDb.apiKey.findMany({
    where: {
      environment: {
        environmentId: { equals: requestBody.environmentId },
      },
    },
  });

  return HttpResponse.json({
    apiKeys: apiKeys.map(({ state, keyId, environment, account, roleId }) => ({
      state,
      keyId,
      environmentId: environment!.environmentId,
      accountId: account?.accountId,
      roleId,
    })),
  });
});

export const cloudApiMockHandlers = [
  getUserIdentityHandler,
  createAccountHandler,
  listAccountsHandler,
  createEnvironmentHandler,
  listEnvironmentsHandler,
  describeEnvironmentHandler,
  destroyEnvironmentHandler,
  createApiKeyHandler,
  describeApiKeyHandler,
  deleteApiKeyHandler,
  listApiKeysHandler,
];
