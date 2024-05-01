import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';
import { DATABASE_INSTANCE } from '@mswjs/data/lib/glossary';

faker.seed(Date.now());

export const cloudApiDb = factory({
  user: {
    userId: primaryKey(faker.string.uuid),
  },
  account: {
    accountId: primaryKey(() => `acc_${faker.string.nanoid(23)}`),
    users: manyOf('user'),
    description: () => faker.lorem.words(4),
  },
  environment: {
    environmentId: primaryKey(() => `env_${faker.string.nanoid(27)}`),
    account: oneOf('account'),
    description: () => faker.lorem.words(4),
    status: () =>
      faker.helpers.arrayElement([
        'PENDING',
        'ACTIVE',
        'FAILED',
        'DELETED',
      ] as const),
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
        'rst:role::ResolveAwakeableAccess',
      ] as const),
    state: () => faker.helpers.arrayElement(['ACTIVE', 'DELETED'] as const),
  },
});

const DB_DATA = 'db';
const getRawDbData = () => ({
  users: cloudApiDb.user.getAll(),
  accounts: cloudApiDb.account.getAll(),
  environments: cloudApiDb.environment.getAll(),
  apiKeys: cloudApiDb.apiKey.getAll(),
});
const persistDbData = () => {
  setTimeout(() => {
    localStorage.setItem(DB_DATA, JSON.stringify(getRawDbData()));
  });
};

type RawDbData = ReturnType<typeof getRawDbData>;
const dbInstance = cloudApiDb[DATABASE_INSTANCE];

const persistedDbData = localStorage.getItem(DB_DATA);
if (persistedDbData) {
  const { users, accounts, environments, apiKeys } = JSON.parse(
    persistedDbData
  ) as RawDbData;
  users.map((user) => cloudApiDb.user.create({ userId: user.userId }));
  accounts.map((account) =>
    cloudApiDb.account.create({
      accountId: account.accountId,
      description: account.description,
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
      description: environment.description,
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

dbInstance.events.removeAllListeners();
dbInstance.events.on('create', persistDbData);
dbInstance.events.on('delete', persistDbData);
dbInstance.events.on('update', persistDbData);
persistDbData();
