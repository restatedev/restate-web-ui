# Cloud App

This application is for Restate Cloud UI, developed using [`Remix SPA mode`](https://remix.run/docs/en/main/future/spa-mode).

### Commands

```sh
# Run Cloud app in dev mode with mock API
pnpm nx serve cloud -c mock

# Run Cloud app against an API
RESTATE_CLOUD_API_URL=https://api.dev.restate.cloud pnpm nx serve cloud

# Build Cloud app in prod mode
pnpm nx build cloud

# Start the Cloud app in prod mode
pnpm nx start cloud

# Run unit tests for Cloud app
pnpm nx test cloud

# Run end-to-end tests for Cloud app
pnpm nx e2e cloud-e2e
```
