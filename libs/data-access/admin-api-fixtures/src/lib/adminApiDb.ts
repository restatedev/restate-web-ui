import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data';
import { faker } from '@faker-js/faker';

faker.seed(Date.now());
const names = faker.helpers.uniqueArray(faker.word.noun, 1000);

let index = 0;
export function getName() {
  return names[index++];
}

export const adminApiDb = factory({
  handler: {
    name: primaryKey(() => `${getName()}`),
    ty: () =>
      faker.helpers.arrayElement(['Exclusive', 'Shared', 'Workflow'] as const),
    input_description: () =>
      'one of ["none", "value of content-type \'application/json\'"]',
    output_description: () => "value of content-type 'application/json'",
  },
  service: {
    name: primaryKey<string>(() => `${getName()}Service`),
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
    dryRun: Boolean,
    endpoint: () => faker.internet.url(),
  },
});

const isE2E = process.env['SCENARIO'] === 'E2E';

if (!isE2E) {
  Array(30)
    .fill(null)
    .map(() => {
      const deployment = adminApiDb.deployment.create();
      Array(Math.floor(Math.random() * 3 + 1))
        .fill(null)
        .map(() => adminApiDb.service.create({ deployment }));
      return deployment;
    });
}
