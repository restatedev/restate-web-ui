import * as cloudApi from '@restate/data-access/cloud/api-client';
import { delay, http, HttpResponse } from 'msw';
import { cloudApiDb } from './cloudApiDb';

type FormatParameterWithColon<S extends string> =
  S extends `${infer A}{${infer P}}${infer B}` ? `${A}:${P}${B}` : S;
type GetPath<S extends keyof cloudApi.paths> = FormatParameterWithColon<
  keyof Pick<cloudApi.paths, S>
>;

const getUserIdentityHandler = http.post<
  never,
  never,
  | cloudApi.operations['GetUserIdentity']['responses']['200']['content']['application/json']
  | cloudApi.operations['GetUserIdentity']['responses']['500']['content']['application/json'],
  GetPath<'/GetUserIdentity'>
>('/GetUserIdentity', async () => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  return HttpResponse.json({
    userId: user.userId,
  });
});

const createAccountHandler = http.post<
  never,
  NonNullable<
    cloudApi.operations['CreateAccount']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['CreateAccount']['responses']['200']['content']['application/json']
  | cloudApi.operations['CreateAccount']['responses']['500']['content']['application/json'],
  GetPath<'/CreateAccount'>
>('/CreateAccount', async ({ request }) => {
  const user = cloudApiDb.user.getAll().at(0);
  const requestBody = await request.json();

  if (!user) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
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
  | cloudApi.operations['ListAccounts']['responses']['200']['content']['application/json']
  | cloudApi.operations['ListAccounts']['responses']['500']['content']['application/json'],
  GetPath<'/ListAccounts'>
>('/ListAccounts', async () => {
  const user = cloudApiDb.user.getAll().at(0);
  await delay(3000);

  if (!user) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
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
  cloudApi.operations['DescribeEnvironment']['parameters']['path'],
  NonNullable<
    cloudApi.operations['DescribeEnvironment']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['DescribeEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['DescribeEnvironment']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/DescribeEnvironment'>
>('/:accountId/DescribeEnvironment', async ({ request }) => {
  const requestBody = await request.json();

  const environment = cloudApiDb.environment.findFirst({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });
  await delay(6000);

  if (!environment) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  return HttpResponse.json({
    environmentId: environment.environmentId,
    accountId: environment.account?.accountId,
    description: environment.description,
    status: environment.status,
  });
});

const destroyEnvironmentHandler = http.post<
  cloudApi.operations['DestroyEnvironment']['parameters']['path'],
  NonNullable<
    cloudApi.operations['DestroyEnvironment']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['DestroyEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['DestroyEnvironment']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/DestroyEnvironment'>
>('/:accountId/DestroyEnvironment', async ({ request }) => {
  const requestBody = await request.json();

  const environment = cloudApiDb.environment.findFirst({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });

  if (!environment) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  cloudApiDb.environment.delete({
    where: {
      environmentId: { equals: requestBody.environmentId },
    },
  });

  return HttpResponse.json({});
});

const createEnvironmentHandler = http.post<
  cloudApi.operations['CreateEnvironment']['parameters']['path'],
  NonNullable<
    cloudApi.operations['CreateEnvironment']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['CreateEnvironment']['responses']['200']['content']['application/json']
  | cloudApi.operations['CreateEnvironment']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/CreateEnvironment'>
>('/:accountId/CreateEnvironment', async ({ params, request }) => {
  const account = cloudApiDb.account.findFirst({
    where: {
      accountId: {
        equals: params.accountId,
      },
    },
  });
  const requestBody = await request.json();

  if (!account) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  const environment = cloudApiDb.environment.create({
    account,
    description: requestBody.description,
    status: 'PENDING',
  });

  return HttpResponse.json({
    environmentId: environment.environmentId,
  });
});

const listEnvironmentsHandler = http.post<
  cloudApi.operations['ListEnvironments']['parameters']['path'],
  never,
  | cloudApi.operations['ListEnvironments']['responses']['200']['content']['application/json']
  | cloudApi.operations['ListEnvironments']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/ListEnvironments'>
>('/:accountId/ListEnvironments', async ({ params }) => {
  const user = cloudApiDb.user.getAll().at(0);

  if (!user) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
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
  cloudApi.operations['CreateApiKey']['parameters']['path'],
  NonNullable<
    cloudApi.operations['CreateApiKey']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['CreateApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['CreateApiKey']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/CreateApiKey'>
>('/:accountId/CreateApiKey', async ({ params, request }) => {
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
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  const apiKey = cloudApiDb.apiKey.create({
    account,
    environment,
    roleId: requestBody.roleId,
    state: 'ACTIVE',
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
  cloudApi.operations['DescribeApiKey']['parameters']['path'],
  NonNullable<
    cloudApi.operations['DescribeApiKey']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['DescribeApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['DescribeApiKey']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/DescribeApiKey'>
>('/:accountId/DescribeApiKey', async ({ params, request }) => {
  const requestBody = await request.json();
  const apiKey = cloudApiDb.apiKey.findFirst({
    where: {
      keyId: {
        equals: requestBody.keyId,
      },
    },
  });
  await delay(Math.random() * 3000);

  if (!apiKey) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
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
  cloudApi.operations['DeleteApiKey']['parameters']['path'],
  NonNullable<
    cloudApi.operations['DeleteApiKey']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['DeleteApiKey']['responses']['200']['content']['application/json']
  | cloudApi.operations['DeleteApiKey']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/DeleteApiKey'>
>('/:accountId/DeleteApiKey', async ({ request }) => {
  const requestBody = await request.json();
  const apiKey = cloudApiDb.apiKey.findFirst({
    where: {
      keyId: {
        equals: requestBody.keyId,
      },
    },
  });

  if (!apiKey) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  return HttpResponse.json({});
});

const listApiKeysHandler = http.post<
  cloudApi.operations['ListApiKeys']['parameters']['path'],
  NonNullable<
    cloudApi.operations['ListApiKeys']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['ListApiKeys']['responses']['200']['content']['application/json']
  | cloudApi.operations['ListApiKeys']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/ListApiKeys'>
>('/:accountId/ListApiKeys', async ({ request }) => {
  const requestBody = await request.json();
  await delay(6000);
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
