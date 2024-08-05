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

### Environments

You can run the e2e tests against different environments

```sh
SCENARIO=E2E nx start cloud -c mock && APP_USERNAME="mock@restate.dev" APP_PASSWORD="123456" BASE_URL=http://localhost:4200 nx e2e cloud-e2e
APP_USERNAME="{DEV_USERNAME}" APP_PASSWORD={DEV_PASSWORD} BASE_URL=https://dev.cloud.restate.dev nx e2e cloud-e2e
APP_USERNAME="{PROD_USERNAME}" APP_PASSWORD={PROD_PASSWORD} BASE_URL=https://staging.cloud.restate.dev nx e2e cloud-e2e
APP_USERNAME="{PROD_USERNAME}" APP_PASSWORD={PROD_PASSWORD} BASE_URL=https://cloud.restate.dev nx e2e cloud-e2e
```
