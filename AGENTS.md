# Agent Guidelines for Restate Web UI

## Commands

- **Dev**: `pnpm nx serve web-ui` (Vite proxies the admin API to a Restate server on localhost:9070)
- **Build**: `pnpm nx build web-ui`
- **Test**: `pnpm nx test <project>` (e.g., `pnpm nx test @restate/ui-button`), add `--watch` for watch mode. Lib projects are named after their package; the apps are `web-ui` and `web-ui-e2e`
- **Single test**: `pnpm nx test <project> --testFile=<file>` or use vitest filtering
- **Lint**: `pnpm nx lint <project>`
- **Typecheck**: `pnpm nx typecheck <project>` (e.g., `pnpm nx typecheck web-ui`); every project runs `tsc --build tsconfig.json`, covering its runtime and spec configs, after the declarations of the projects it depends on are emitted (into each lib's `dist/`)
- **Sync project references**: `pnpm nx sync` (CI runs `pnpm nx sync:check`)
- **E2E**: `pnpm nx e2e web-ui-e2e`

## Library Generation

Every lib is created by an Nx generator and kept exactly as the generator writes it: no cleanup or hand-edits afterwards. All existing libs have that shape, so a new lib looks like the others. The generator options are defaults in `nx.json`, so the commands below are complete.

Libs live in `libs/<type>/<NAME>`, where `<type>` is `ui`, `features`, `data-access` or `util`. Each lib is a workspace package named `@restate/<type>-<NAME>`, which is also its Nx project name.

**React library** (anything that uses React: components, hooks, routes)

```bash
pnpm nx g @nx/react:lib libs/<type>/<NAME> --importPath=@restate/<type>-<NAME>
```

**JS library** (no React)

```bash
pnpm nx g @nx/js:library libs/<type>/<NAME> --importPath=@restate/<type>-<NAME>
```

Example: `pnpm nx g @nx/react:lib libs/ui/badge --importPath=@restate/ui-badge` creates the project `@restate/ui-badge`.

- **What you get:** a `package.json` with no dependencies (they all live in the root), composite tsconfigs, a Vitest config, and a sample component or function with a spec. Replace the sample with your code in `src/`.
- **Using it:** the package is linked into `node_modules` right away, so other libs can import it as `@restate/<type>-<NAME>`. `pnpm nx sync` adds the project references. Nx runs it automatically before tasks only in an interactive terminal; in scripts, agents and CI, run it yourself. Commit the updated tsconfigs, or CI's `nx sync:check` fails.
- **Tests:** a lib without specs is fine, because `nx test` passes when there are no test files.
- **JS libs use `nodenext`:** relative imports need an explicit `.js` extension (`export * from './lib/foo.js'`), and JSON imports need `with { type: 'json' }`.
- **Generator leftovers stay:** the React generator writes a `.babelrc` and adds `@swc/helpers` to the root `package.json`, and both generators add the `test` → `^build` target default in `nx.json`. Nothing uses them, but keep them so new generations don't change shared files.
- **Don't pass:**
  - `--bundler`, `--buildable` or `--publishable`, which add build targets nothing uses;
  - `--compiler=swc`, which switches the Vite plugin;
  - `--unitTestRunner=none`, because adding tests later with `@nx/vitest:configuration` produces a spec tsconfig without the reference to the lib's tsconfig, which fails typecheck;
  - `--useProjectJson`, which brings back the old layout.

## Code Style

- **Package manager**: pnpm (monorepo managed by Nx). Every lib in `libs/*/*` is a workspace package with no dependencies or scripts of its own; all dependencies live in the root `package.json` (add them with `pnpm add -w`). pnpm links the libs into the root `node_modules` through `publicHoistPattern` in `pnpm-workspace.yaml`, so don't list them as `workspace:*` dependencies
- **TypeScript**: Strict mode enabled, use `noUncheckedIndexedAccess`. Every project is composite (`composite` is set in `tsconfig.base.json`) and linked by project references that `nx sync` maintains
- **Imports**: Import libs by package name (`@restate/ui-*`, `@restate/features-*`, `@restate/data-access-*`, `@restate/util-*`). There are no tsconfig path aliases
- **Formatting**: oxfmt (`.oxfmtrc.json`) with single quotes, trailing commas, Tailwind class sorting; run `pnpm nx format`
- **Linting**: oxlint (`.oxlintrc.json`); `tools/oxlint-plugin-restate.js` enforces the `tv()` className rule and bans Tailwind palette colors (`restate/no-palette-colors`)
- **Styling**: Tailwind CSS, use `tv()` from `@restate/util-styles` for component variants. Never use string interpolation for dynamic Tailwind classes (e.g., `${isVoid ? 'text-subtle' : 'text-muted'}`). Always use `tv()` with variants instead.
- **Colors**: only role tokens from `@restate/util-styles/theme.css` (`bg-surface`, `text-muted`, `border-default`, `bg-danger-subtle`, …), never palette classes (`bg-gray-100`) or `var(--color-*)`. Before styling UI, read `libs/util/styles/DESIGN.md` for which token to use when and the common recipes. The dev server renders every token and shared component at `/ui/design-system`
- **Components**: React 19, React Aria Components for UI primitives, use `forwardRef` for refs
- **Types**: Define props interfaces explicitly, use `PropsWithChildren` when needed
- **Testing**: Vitest + Testing Library, test files use `.spec.tsx` suffix (`.spec.ts` in JS libs)
- **Comments**: NEVER add comments unless explicitly requested by the user
- **Code reuse**: Avoid duplication. When creating similar hooks or components, look for opportunities to reuse existing logic (e.g., if two hooks fetch from the same endpoint, use one hook and access the full response data).

## API Types

- **Regenerate types**: After modifying OpenAPI schemas in `libs/data-access/admin-api/src/lib/api/*.json`, run `pnpm nx create @restate/data-access-admin-api-spec` to regenerate TypeScript types.

## Stoplight Elements

- **Vendored build**: The app uses a prebuilt bundle from our Elements fork, committed in `libs/ui/api/vendor/elements/`. There is no `@stoplight/*` npm dependency and no pnpm patch.
- **Source checkout**: The fork lives at `../elements-restate` (`restate` branch, rebased on upstream `stoplightio/elements`).
- **What is vendored**: `elements-web-components.min.js`, `elements-web-components.min.js.LICENSE.txt`, `elements-web-components.min.scoped.css`, `LICENSE`, `NOTICE`, and a `package.json` that only carries the name, version and license for `vendor.LICENSE.txt` attribution.
- **Web components**: `<elements-api>` (playground) and `<elements-json-schema-viewer>` (handler schemas). `@restate/ui-api` renders both; `@restate/ui-api/assets` exports the asset URLs that `apps/web-ui/app/root.tsx` loads.
- **Reference doc**: Follow `libs/ui/api/ELEMENTS.md` to rebuild and refresh the vendored files.

## Releasing

- **Trigger**: `.github/workflows/release.yml` publishes `v<version>` on any push to `main` or a `release-*` branch whose `package.json` `version` has no GitHub release yet, then opens a PR in `restatedev/restate-web-ui-crate`.
- **Releasing an older commit**: Push the version bump on a `release-<version>` branch created from that commit, then cherry-pick the release commit to `main` once the release is published.
- **Branch names**: Only use the `release-` prefix for branches meant to publish a release.
- **Reference doc**: Follow the Releasing section in `README.md`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
