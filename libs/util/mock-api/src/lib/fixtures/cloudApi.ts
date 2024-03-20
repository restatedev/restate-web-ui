import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';

faker.seed(123);

export const cloudApiDb = factory({
  user: {
    userId: primaryKey(faker.datatype.uuid),
  },
  account: {
    accountId: primaryKey(faker.datatype.uuid),
    users: manyOf('user'),
  },
  environment: {
    environmentId: primaryKey(faker.datatype.uuid),
    account: oneOf('account'),
  },
  apiKey: {
    account: oneOf('account'),
    environment: oneOf('environment'),
    keyId: primaryKey(faker.datatype.uuid),
    apiKey: primaryKey(faker.datatype.uuid),
    roleId: () => faker.helpers.arrayElement(['rst:role::FullAccess'] as const),
    state: () => faker.helpers.arrayElement(['KEY_ACTIVE'] as const),
  },
});

const users = Array(5)
  .fill(null)
  .map(() => cloudApiDb.user.create());
const account = cloudApiDb.account.create({ users });
const environments = Array(2)
  .fill(null)
  .map(() => cloudApiDb.environment.create({ account }));
environments.forEach((environment) => {
  cloudApiDb.apiKey.create({
    environment,
    account: environment.account,
  });
});
