import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';
import { DATABASE_INSTANCE } from '@mswjs/data/lib/glossary';
import { readFileSync, writeFileSync } from 'fs';

faker.seed(Date.now());

export const cloudApiDb = factory({
  user: {
    userId: primaryKey(faker.string.uuid),
  },
  account: {
    accountId: primaryKey(() => `acc_${faker.string.nanoid(23)}`),
    users: manyOf('user'),
    name: () => faker.internet.domainWord(),
  },
  environment: {
    environmentId: primaryKey(() => `env_${faker.string.nanoid(27)}`),
    account: oneOf('account'),
    name: () => faker.internet.domainWord(),
    status: () =>
      faker.helpers.arrayElement([
        'PENDING',
        'ACTIVE',
        'FAILED',
        'DELETED',
      ] as const),
    signingPublicKey: () => faker.string.nanoid(23),
    ingressBaseUrl: () => faker.internet.url(),
    adminBaseUrl: () => 'http://localhost:4000/admin',
  },
  apiKey: {
    account: oneOf('account'),
    environment: oneOf('environment'),
    keyId: () => `key_${faker.string.nanoid(23)}`,
    apiKey: primaryKey(
      () => `key_${faker.string.nanoid(23)}.${faker.string.nanoid(44)}`
    ),
    roleId: () =>
      faker.helpers.arrayElement([
        'rst:role::FullAccess',
        'rst:role::IngressAccess',
        'rst:role::AdminAccess',
        'rst:role::CompleteAwakeableAccess',
      ] as const),
    state: () => 'ACTIVE' as 'ACTIVE' | 'DELETED',
    description: () => faker.lorem.words(4),
  },
});

const getRawDbData = () => ({
  users: cloudApiDb.user.getAll(),
  accounts: cloudApiDb.account.getAll(),
  environments: cloudApiDb.environment.getAll(),
  apiKeys: cloudApiDb.apiKey.getAll(),
});
const persistDbData = () => {
  setTimeout(() => {
    writeFileSync('db.json', JSON.stringify(getRawDbData()));
  });
};

type RawDbData = ReturnType<typeof getRawDbData>;
const dbInstance = cloudApiDb[DATABASE_INSTANCE];
const isE2E = process.env['SCENARIO'] === 'E2E';

let persistedDbData: string | null = null;
try {
  persistedDbData = readFileSync('db.json').toString();
  // eslint-disable-next-line no-empty
} catch (_) {}

if (isE2E) {
  cloudApiDb.user.create();
} else {
  if (persistedDbData) {
    const { users, accounts, environments, apiKeys } = JSON.parse(
      persistedDbData
    ) as RawDbData;
    users.map((user) => cloudApiDb.user.create({ userId: user.userId }));
    accounts.map((account) =>
      cloudApiDb.account.create({
        accountId: account.accountId,
        name: account.name,
        users: cloudApiDb.user.findMany({
          where: {
            userId: {
              in: account.users.map(({ userId }) => userId),
            },
          },
        }),
      })
    );
    environments.map((environment) =>
      cloudApiDb.environment.create({
        environmentId: environment.environmentId,
        name: environment.name,
        account: cloudApiDb.account.findFirst({
          where: {
            accountId: {
              equals: environment.account?.accountId,
            },
          },
        })!,
      })
    );
    apiKeys.map((apiKey) =>
      cloudApiDb.apiKey.create({
        roleId: apiKey.roleId,
        keyId: apiKey.keyId,
        apiKey: apiKey.apiKey,
        state: apiKey.state,
        account: cloudApiDb.account.findFirst({
          where: {
            accountId: {
              equals: apiKey.account?.accountId,
            },
          },
        })!,
        environment: cloudApiDb.environment.findFirst({
          where: {
            environmentId: {
              equals: apiKey.environment?.environmentId,
            },
          },
        })!,
      })
    );
  } else {
    const users = Array(5)
      .fill(null)
      .map(() => cloudApiDb.user.create());
    const account = cloudApiDb.account.create({
      users,
    });
    const environments = (
      ['PENDING', 'ACTIVE', 'FAILED', 'DELETED'] as const
    ).map((status) =>
      cloudApiDb.environment.create({
        account,
        status,
      })
    );
    environments.forEach((environment) => {
      cloudApiDb.apiKey.create({
        environment,
        account: environment.account,
      });
    });
  }
}

dbInstance.events.removeAllListeners();
dbInstance.events.on('create', persistDbData);
dbInstance.events.on('delete', persistDbData);
dbInstance.events.on('update', persistDbData);
persistDbData();
