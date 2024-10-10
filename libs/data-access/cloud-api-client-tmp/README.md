# Cloud API Client

This library allows access to Restate Cloud API.

### How to modify the API?

- Access the OpenAPI specification of the API at [`schema.yaml`](./src/lib/api/schema.yaml).
- Make changes to the spec, then execute below to validate and generate API types at [`index.d.ts`](./src/lib/api/index.d.ts).

```ts
nx create cloud-api-client-tmp
```

### How to use the API?

- We utilize [`openapi-fetch`](https://openapi-ts.pages.dev/openapi-fetch/) to build a typed client from the spec.
- The simplified methods are exported from this library and can be used as follows:

```ts
import { createApiKey } from '@restate/data-access/cloud-api';

const {
  data, // included for 2XX response
  error, // included for 4XX or 5XX response
} = await createApiKey({
  accountId: 'my-account',
  environmentId: 'my-environment',
  roleId: 'rst:role::FullAccess',
});

console.log(data?.apiKey);
```
