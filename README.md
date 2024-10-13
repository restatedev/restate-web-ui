# Restate Web UI

This repository is for Restate Web UI.

## Getting started

- This repository uses [`pnpm`](https://pnpm.io) as the package manager. If you are not contributing to the project, you do not need to install `pnpm`.

```sh
# Install dependencies
pnpm install
```

- This repository utilizes [`nx`](https://nx.dev) for the monorepo structure. Each package within the monorepo has multiple targets. To run a target for a package, use commands like:

```sh
# pnpm nx <target> <project> <...options>

# Run the web ui app in dev mode with mock configuration
pnpm nx serve web-ui --configuration=mock

# Run the web ui app in dev mode against a local restate server
pnpm nx serve web-ui --configuration=local

# Run the ui-button unit tests in watch mode
pnpm nx run test ui-button --watch
```

Details of each package's targets can be available in the `project.json` file within each package.

## Important Packages

- [Web UI App](apps/web-ui/README.md)
- [Admin Api Client](libs/data-access/admin-api/README.md)
