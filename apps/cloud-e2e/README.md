# Cloud e2e

This is the application for running the end-to-end (E2E) tests for the Cloud app.

### Base URL

Provide the `BASE_URL` as the URL that the E2E tests should be run against:

```sh
BASE_URL=http://localhost:4200 pnpm nx e2e cloud-e2
BASE_URL=https://dev.cloud.restate.dev pnpm nx e2e cloud-e2
BASE_URL=https://staging.cloud.restate.dev pnpm nx e2e cloud-e2
BASE_URL=https://cloud.restate.dev pnpm nx e2e cloud-e2
```

### Credentials

For the development, staging, and production environments, provide account details using `APP_USERNAME` and `APP_PASSWORD`. Find the E2E test account details in Restate 1Password.

```sh
APP_USERNAME="some-account@restate.dev" APP_PASSWORD="some-password" BASE_URL=https://staging.cloud.restate.dev pnpm nx e2e cloud-e2
```

### Proxy

To proxy the Cloud UI to your local environment (or any other environment), set `DEPLOYMENT_URL`:

```sh
# This proxies https://dev.cloud.restate.dev to your local environment
# and runs E2E tests on your local machine.
APP_USERNAME="my-account@restate.dev" APP_PASSWORD=some-password DEPLOYMENT_URL=http://localhost:4200 BASE_URL=https://dev.cloud.restate.dev pnpm nx e2e cloud-e2
```
