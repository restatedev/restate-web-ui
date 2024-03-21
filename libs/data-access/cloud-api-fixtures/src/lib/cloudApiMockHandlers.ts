import * as cloudApi from '@restate/data-access/cloud-api';
import { http, HttpResponse } from 'msw';
import { cloudApiDb } from './cloudApiDb';

type FormatParameterWithColon<S extends string> =
  S extends `${infer A}{${infer P}}${infer B}` ? `${A}:${P}${B}` : S;
type GetPath<S extends keyof cloudApi.paths> = FormatParameterWithColon<
  keyof Pick<cloudApi.paths, S>
>;

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
  never,
  | cloudApi.operations['createAccount']['responses']['200']['content']['application/json']
  | cloudApi.operations['createAccount']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/CreateAccount'>
>('/cloud/CreateAccount', async () => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const account = cloudApiDb.account.create({ users: [user] });

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

const createEnvironmentHandler = http.post<
  cloudApi.operations['createEnvironment']['parameters']['path'],
  never,
  | cloudApi.operations['createEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['createEnvironment']['responses']['500']['content']['text/plain'],
  GetPath<'/cloud/{accountId}/CreateEnvironment'>
>('/cloud/:accountId/CreateEnvironment', async ({ params }) => {
  const account = cloudApiDb.account.findFirst({
    where: {
      accountId: {
        equals: params.accountId,
      },
    },
  });

  if (!account) {
    return HttpResponse.text('internal server error', { status: 500 });
  }

  const environment = cloudApiDb.environment.create({ account });

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

export const cloudApiMockHandlers = [
  getUserIdentityHandler,
  createAccountHandler,
  listAccountsHandler,
  createEnvironmentHandler,
  listEnvironmentsHandler,
  createApiKeyHandler,
];
