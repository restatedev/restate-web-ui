# Cloud App

This application is for Restate Cloud UI, developed using [`Remix SPA mode`](https://remix.run/docs/en/main/future/spa-mode).

### Commands

```sh
# Run Cloud app in dev mode with mock API
pnpm nx serve cloud -c mock

# Run Cloud app against dev API
pnpm nx serve cloud -c local-dev

# Run Cloud app against prod API
pnpm nx serve cloud -c local-prod

# Build Cloud app in prod mode
pnpm nx build cloud

# Start the Cloud app in prod mode
pnpm nx start cloud

# Run unit tests for Cloud app
pnpm nx test cloud

# Run end-to-end tests for Cloud app
pnpm nx e2e cloud-e2e
```

### Deployments

**Dev**: Commits pushed to the `main` branch are automatically deployed to our development environment, which can be accessed at `https://dev.cloud.restate.dev`.

**Prod**: Commits that are tagged with version numbers will automatically trigger deployments to our production environment at `https://cloud.restate.dev`.
