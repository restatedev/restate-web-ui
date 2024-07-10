import type * as cloudApi from '@restate/data-access/cloud/api-client/spec';
import { delay, http, HttpResponse } from 'msw';
import { cloudApiDb } from './cloudApiDb';
import { logs } from './logs';

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
    name: requestBody.name,
  });

  return HttpResponse.json({
    accountId: account.accountId,
    name: account.name,
  });
});

const deleteAccountHandler = http.post<
  never,
  NonNullable<
    cloudApi.operations['DeleteAccount']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['DeleteAccount']['responses']['200']['content']['application/json']
  | cloudApi.operations['DeleteAccount']['responses']['500']['content']['application/json'],
  GetPath<'/DeleteAccount'>
>('/DeleteAccount', async ({ request }) => {
  const requestBody = await request.json();
  cloudApiDb.account.delete({
    where: {
      accountId: {
        equals: requestBody.accountId,
      },
    },
  });

  return HttpResponse.json({});
});

const listAccountsHandler = http.post<
  never,
  never,
  | cloudApi.operations['ListAccounts']['responses']['200']['content']['application/json']
  | cloudApi.operations['ListAccounts']['responses']['500']['content']['application/json'],
  GetPath<'/ListAccounts'>
>('/ListAccounts', async () => {
  const user = cloudApiDb.user.getAll().at(0);

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
    accounts: accounts.map(({ accountId, name }) => ({
      accountId,
      name,
    })),
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
  await delay(300);

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

  const apiKeys = cloudApiDb.apiKey.findMany({
    where: {
      environment: {
        environmentId: { equals: requestBody.environmentId },
      },
    },
  });

  return HttpResponse.json({
    environmentId: environment.environmentId,
    name: environment.name,
    status: environment.status,
    apiKeys: apiKeys
      .filter(({ state }) => state !== 'DELETED')
      .map(({ keyId, environment }) => ({
        keyId,
        environmentId: environment!.environmentId,
      })),
    signingPublicKey: environment.signingPublicKey,
    ingressBaseUrl: environment.ingressBaseUrl,
    adminBaseUrl: environment.adminBaseUrl + `/${environment.environmentId}`,
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
  cloudApiDb.apiKey.delete({
    where: {
      environment: { environmentId: { equals: requestBody.environmentId } },
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
  await delay(300);
  if (!account) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' },
      { status: 500 }
    );
  }

  const environment = cloudApiDb.environment.create({
    account,
    name: requestBody.name,
    status: 'PENDING',
  });

  setTimeout(() => {
    cloudApiDb.environment.update({
      where: { environmentId: { equals: environment.environmentId } },
      data: { status: 'ACTIVE' },
    });
  }, 10000);

  return HttpResponse.json({
    environmentId: environment.environmentId,
    name: environment.name,
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
    environments: environments.map(({ environmentId, name }) => ({
      environmentId,
      name,
    })),
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
    description: requestBody.description,
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
    state: apiKey.state,
    keyId: apiKey.keyId,
    description: apiKey.description,
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
  const apiKey = cloudApiDb.apiKey.update({
    where: {
      keyId: {
        equals: requestBody.keyId,
      },
    },
    data: {
      state: 'DELETED',
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
  const apiKeys = cloudApiDb.apiKey.findMany({
    where: {
      environment: {
        environmentId: { equals: requestBody.environmentId },
      },
    },
  });

  return HttpResponse.json({
    apiKeys: apiKeys
      .filter(({ state }) => state !== 'DELETED')
      .map(({ state, keyId, environment, account, roleId }) => ({
        state,
        keyId,
        environmentId: environment!.environmentId,
        accountId: account?.accountId,
        roleId,
      })),
  });
});

const getEnvironmentLogsHandler = http.post<
  cloudApi.operations['GetEnvironmentLogs']['parameters']['path'],
  NonNullable<
    cloudApi.operations['GetEnvironmentLogs']['requestBody']
  >['content']['application/json'],
  | cloudApi.operations['GetEnvironmentLogs']['responses']['200']['content']['application/json']
  | cloudApi.operations['GetEnvironmentLogs']['responses']['500']['content']['application/json'],
  GetPath<'/{accountId}/GetEnvironmentLogs'>
>('/:accountId/GetEnvironmentLogs', async ({ request }) => {
  const requestBody = await request.json();
  await delay(2000);

  const delta = requestBody.end - requestBody.start;

  const logsLength = (delta: number) => {
    if (delta > 45 * 60) {
      return 200;
    }
    if (delta > 10 * 60) {
      return 100;
    }
    if (delta > 4 * 60) {
      return 15;
    }
    return 2;
  };

  return HttpResponse.json({
    lines: Array(logsLength(delta))
      .fill(null)
      .map((_, index) => requestBody.start + (index / (200 - 1)) * delta)
      .map((sec) =>
        (BigInt(Math.floor(sec * 1000)) * BigInt(1000000)).toString()
      )
      .map((unixNanos) => {
        const line = logs.at(Math.floor(Math.random() * logs.length))!;

        return {
          unixNanos,
          line: JSON.stringify({
            timestamp: new Date(Number(unixNanos) / 1000000).toISOString(),
            ...JSON.parse(line),
          }),
        };
      }),
  });
});

const openApiHandler = http.get(
  '/admin/:envId/openapi',
  async ({ request }) => {
    return HttpResponse.json({
      openapi: '3.0.0',
      info: {
        title: 'Admin API',
        version: '0.9.2',
      },
    });
  }
);

const healthHandler = http.get('/admin/:envId/health', async ({ request }) => {
  if (Math.random() < 0.5) {
    return HttpResponse.json({}, { status: 500 });
  } else {
    return HttpResponse.json({}, { status: 200 });
  }
});

const tokenHandler = http.post('/oauth2/token', async ({ request }) => {
  return HttpResponse.json({ access_token: '1234' }, { status: 200 });
});

const loginHandler = http.get('/login', async ({ request }) => {
  return HttpResponse.redirect('http://localhost:4200/auth?code=1234');
});

const slackHandler = http.post('/slack', async ({ request }) => {
  return HttpResponse.json({ ok: true }, { status: 200 });
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
  getEnvironmentLogsHandler,
  openApiHandler,
  healthHandler,
  tokenHandler,
  loginHandler,
  slackHandler,
];
