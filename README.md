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

# Run the web ui app in dev mode (proxies the admin API to a Restate server on localhost:9070)
pnpm nx serve web-ui

# Run the button unit tests in watch mode
pnpm nx test @restate/ui-button --watch
```

Details of each package's targets can be available in the `project.json` file within each package.

## Releasing

The [release workflow](.github/workflows/release.yml) runs on every push to `main` or to a `release-*` branch. If the `version` in `package.json` has no GitHub release yet, the workflow:

1. Builds the web UI and publishes the `v<version>` release, marked as latest, with `ui-v<version>.zip` attached.
2. Opens an auto-merging PR in [restate-web-ui-crate](https://github.com/restatedev/restate-web-ui-crate) that updates the crate to the new assets.

If the version is already released, the workflow does nothing.

### Release from `main`

Open a PR that bumps `version` in `package.json` and merge it.

### Release from another commit

To release a commit other than the tip of `main`, for example to leave out a change that has already merged, bump the version on a `release-<version>` branch created from that commit:

```sh
git switch -c release-<version> <commit>
# set "version" in package.json to <version>
git commit -s -am "Release <version>"
git push -u origin release-<version>
```

Once the release is published, cherry-pick the release commit into a PR to `main`, so that `main` carries the released version. When that PR merges, the workflow sees that the version is already released and does nothing.

Any push to a `release-*` branch can publish a release, so don't use that prefix for other branches.

## Important Packages

- [Web UI App](apps/web-ui/README.md)
- [Admin Api Client](libs/data-access/admin-api/README.md)
