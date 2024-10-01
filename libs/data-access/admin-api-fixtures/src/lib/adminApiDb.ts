import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';

faker.seed(Date.now());

export const adminApiDb = factory({
  handler: {
    name: primaryKey(() => `${faker.hacker.noun()}`),
    ty: () =>
      faker.helpers.arrayElement(['Exclusive', 'Shared', 'Workflow'] as const),
    input_description: () =>
      'one of ["none", "value of content-type \'application/json\'"]',
    output_description: () => "value of content-type 'application/json'",
  },
  service: {
    name: primaryKey(() => `${faker.hacker.noun()}Service`),
    handlers: manyOf('handler'),
    deployment: oneOf('deployment'),
    ty: () =>
      faker.helpers.arrayElement([
        'Service',
        'VirtualObject',
        'Workflow',
      ] as const),
    revision: () => faker.number.int(),
    idempotency_retention: () => '1Day',
    workflow_completion_retention: () => '1Day',
    public: () => faker.datatype.boolean(),
  },
  deployment: {
    id: primaryKey(() => `dp_${faker.string.nanoid(27)}`),
    services: manyOf('service'),
  },
});

const services = Array(3)
  .fill(null)
  .map(() => adminApiDb.service.create());
Array(30)
  .fill(null)
  .map(() =>
    adminApiDb.deployment.create({
      services: services.slice(
        0,
        Math.floor(Math.random() * services.length + 1)
      ),
    })
  );
