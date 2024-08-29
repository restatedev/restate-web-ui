import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';

faker.seed(Date.now());

export const adminApiDb = factory({
  service: {
    name: primaryKey(() => `${faker.hacker.noun()}Service`),
    // handlers: [],
    deployment: oneOf('deployment'),
    ty: () =>
      faker.helpers.arrayElement([
        'Service',
        'VirtualObject',
        'Workflow',
      ] as const),
    revision: () => faker.number.int(),
    // idempotency_retention
    // workflow_completion_retention
    public: () => faker.datatype.boolean(),
  },
  deployment: {
    id: primaryKey(() => `dp_${faker.string.nanoid(27)}`),
    services: manyOf('service'),
  },
});

const deployment = adminApiDb.deployment.create();
adminApiDb.service.create({ deployment });
