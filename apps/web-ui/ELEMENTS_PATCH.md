# Elements Web Components Patch Workflow

This app loads the Stoplight Elements web-component artifacts directly from the
patched installed package at build time.

The source of truth for those assets is the patched installed package:

- package: `@stoplight/elements@9.0.19`
- patch: `patches/@stoplight__elements@9.0.19.patch`

The repo root `package.json` registers that patch under
`pnpm.patchedDependencies`.

`apps/web-ui/app/root.tsx` imports the package-backed asset URLs:

- `@stoplight/elements/elements-web-components.min.scoped.css?url`
- `@stoplight/elements/elements-web-components.min.js?url`

That means there are no duplicated Elements JS/CSS artifacts to refresh in
`apps/web-ui/public/`. Once the patched package is installed, the app build
will pick up the current asset files automatically.

## Update The pnpm Patch

Use this when the forked Elements artifacts change and the installed package
needs to be refreshed.

1. Prepare the updated Elements package contents you want to ship.
2. Open a pnpm patch edit dir from the repo root:

```bash
pnpm patch @stoplight/elements@9.0.19 --edit-dir /tmp/stoplight-elements-patch
```

3. Replace the relevant files in `/tmp/stoplight-elements-patch` with the new
versions:

- `web-components.min.js`
- `web-components.min.js.LICENSE.txt`
- `styles.min.css`
- `elements-web-components.min.js`
- `elements-web-components.min.js.LICENSE.txt`
- `elements-web-components.min.scoped.css`
- `NOTICE`

4. Make sure `/tmp/stoplight-elements-patch/package.json` still includes:

- `elements-web-components.min.js` in `sideEffects`
- export for `./elements-web-components.min.js`
- export for `./elements-web-components.min.scoped.css`

5. Commit the patch back into the repo:

```bash
pnpm patch-commit /tmp/stoplight-elements-patch
```

6. Reinstall dependencies so `node_modules` matches the updated patch:

```bash
pnpm install
```

7. Rebuild the app to verify the imported asset URLs still resolve:

```bash
pnpm nx build web-ui
```

## License Handling

`rollup-plugin-license` only sees modules that are part of the app bundle.
The Elements web-component files are imported via `?url`, but the sidecar
license texts are still not part of the normal bundle graph.

To cover that, [vite.config.ts](/Users/nik/Developer/restate-web-ui-3/apps/web-ui/vite.config.ts:1)
registers a client-build plugin that reads these files from the installed
patched package:

- `elements-web-components.min.js.LICENSE.txt`
- `LICENSE`
- `NOTICE`

and appends them to:

- `dist/apps/web-ui/vendor.LICENSE.txt`

The build still writes a consolidated `vendor.LICENSE.txt` for the patched
Elements package.
