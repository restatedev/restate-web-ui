import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';

faker.seed(123);

export const cloudApiDb = factory({
  user: {
    userId: primaryKey(faker.string.uuid),
  },
  account: {
    accountId: primaryKey(faker.string.uuid),
    users: manyOf('user'),
    description: () => faker.internet.domainWord(),
  },
  environment: {
    environmentId: primaryKey(faker.string.uuid),
    account: oneOf('account'),
    description: () => faker.commerce.product(),
  },
  apiKey: {
    account: oneOf('account'),
    environment: oneOf('environment'),
    keyId: () => faker.string.uuid(),
    apiKey: primaryKey(faker.string.uuid),
    roleId: () =>
      faker.helpers.arrayElement([
        'rst:role::FullAccess',
        'rst:role::IngressAccess',
        'rst:role::AdminAccess',
        'rst:role::ResolveAwakeableAccess',
      ] as const),
    state: () =>
      faker.helpers.arrayElement([
        'KEY_NEW',
        'KEY_ACTIVE',
        'KEY_DISABLED',
        'KEY_DELETED',
        'UNRECOGNIZED',
      ] as const),
  },
});

const users = Array(5)
  .fill(null)
  .map(() => cloudApiDb.user.create());
const account = cloudApiDb.account.create({
  users,
});
const environments = Array(2)
  .fill(null)
  .map(() =>
    cloudApiDb.environment.create({
      account,
    })
  );
environments.forEach((environment) => {
  cloudApiDb.apiKey.create({
    environment,
    account: environment.account,
  });
});
