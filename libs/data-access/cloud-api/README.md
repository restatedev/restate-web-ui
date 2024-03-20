# data-access-cloud-api

Use this library to access Restate Cloud API.

### How to make changes to the API?

- You can access the OpenAPI spec of the API at `./src/lib/api/schema.yaml`.
- Apply changes to the spec, and then run `nx run data-access-cloud-api:generate` which will validate and generate the types for the API at `./src/lib/api/index.d.ts`.

### How to consume the API?

- We use [`openapi-fetch`](https://openapi-ts.pages.dev/openapi-fetch/) to create typed client from the spec.
- The simplified version of the methods have been exported from this lib and can be used like

```ts
import { createApiKey } from '@restate/data-access/cloud-api';

const {
  data, // only present if 2XX response
  error, // only present if 4XX or 5XX response
} = await createApiKey({
  accountId: 'my-account',
  environmentId: 'my-environment',
  roleId: 'rst:role::FullAccess',
});

console.log(data?.apiKey);
```
