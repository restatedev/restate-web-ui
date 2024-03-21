# Mock API

This library uses `msw` (https://mswjs.io) to mock the API.

## How to mock your API

```ts
import { enableMockApi } from '@restate/util/mock-api';

// Prior to starting your app
if (process.env.NODE_ENV === 'development') {
  await enableMockApi(myMockHandlers);
}
```
