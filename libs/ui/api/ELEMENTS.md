# Stoplight Elements (vendored)

The playground and the handler schema viewer come from our fork of
Stoplight Elements. Its built web-component bundle is committed in
`vendor/elements/`, so the app has no `@stoplight/*` npm dependencies.

## What is in `vendor/elements/`

| File                                         | Purpose                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `elements-web-components.min.js`             | Defines `<elements-api>` and `<elements-json-schema-viewer>`                |
| `elements-web-components.min.js.LICENSE.txt` | Licenses of the libraries inside the bundle                                 |
| `elements-web-components.min.scoped.css`     | Styles, scoped under the `.stoplight` host class                            |
| `LICENSE`, `NOTICE`                          | Elements license and fork notice                                            |
| `package.json`                               | Name, version and license only, so `vendor.LICENSE.txt` attributes the fork |

`src/assets.ts` (imported as `@restate/ui-api/assets`) exports the JS and CSS
URLs. `apps/web-ui/app/root.tsx` loads them. `src/lib/API.tsx` renders the two
custom elements.

## Refreshing the bundle

The fork lives at `../elements-restate` on the `restate` branch; its
`upstream` remote is `https://github.com/stoplightio/elements`.

1. Rebase the fork on upstream if needed:

   ```bash
   cd ../elements-restate
   git fetch upstream main
   git rebase upstream/main
   yarn install --frozen-lockfile
   ```

2. Run the fork tests that cover our changes:

   ```bash
   (cd packages/elements-core && npx jest src/components/TryIt src/web-components src/utils/exampleGeneration)
   (cd packages/elements && npx jest src/web-components)
   ```

3. Build the web-component artifacts:

   ```bash
   cd packages/elements
   yarn build.webcomponents.artifacts
   ```

4. From the web-ui repo root, copy the artifacts:

   ```bash
   cp ../elements-restate/packages/elements/dist/{elements-web-components.min.js,elements-web-components.min.js.LICENSE.txt,elements-web-components.min.scoped.css,LICENSE,NOTICE} libs/ui/api/vendor/elements/
   ```

5. Set `version` in `vendor/elements/package.json` to the fork's
   `packages/elements/package.json` version.

6. Verify:

   ```bash
   pnpm nx build web-ui
   grep -A3 "Name: @stoplight/elements" dist/apps/web-ui/vendor.LICENSE.txt
   ```

   Then check the service playground (Try it) and a handler's JSON schema
   popover in the running app.
