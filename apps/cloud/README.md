# Cloud App

This application is for Restate Cloud UI, developed using [`Remix`](https://remix.run/), and deployed in [Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-a-remix-site/).

### Commands

```sh
# Run Cloud app in dev mode with mock API
pnpm nx serve cloud -c mock

# Run Cloud app against dev API
pnpm nx serve cloud -c dev

# Run Cloud app against prod API
pnpm nx serve cloud -c prod

# Build Cloud app in prod mode
pnpm nx build cloud

# Start the Cloud app with Cloudflare setup
pnpm nx start cloud -c mock|dev|prod

# Run unit tests for Cloud app
pnpm nx test cloud

# Run end-to-end tests for Cloud app
pnpm nx e2e cloud-e2e
```

### Env variables and secrets

These env variables/secrets need to be setup:

- **Variables**: The variables are set in `.github/workflows/[ENV].yml` and Cloudflare dashboard:
  - `RESTATE_AUTH_URL`: The URL where AWS Cognito is hosted
  - `RESTATE_AUTH_CLIENT_ID`: The client id for AWS Cognito
  - `RESTATE_AUTH_REDIRECT_URL`: The redirect url for AWS Cognito
  - `RESTATE_CLOUD_API_URL`: The Restate Cloud base url
  - `SLACK_API_URL`: The Slack API url
- **Secrets**: The secrets are set in Cloudflare dashboard.
  - `SLACK_TOKEN`: The slack token for `restate-cloud-support` app

### Deployments

**Dev**: Commits pushed to the `main` branch are automatically deployed to our development environment (dev AWS Cognito + dev API), which can be accessed at `https://dev.cloud.restate.dev`.

**Staging**: Commits pushed to the `main` branch are automatically deployed to our staging environment (prod AWS Cognito + prod API), which can be accessed at `https://staging.cloud.restate.dev`.

**Prod**: Commits that are tagged with version numbers will automatically trigger deployments to our production environment at `https://cloud.restate.dev`.
