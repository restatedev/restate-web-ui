# Agent Guidelines for Restate Web UI

## Commands

- **Dev**: `pnpm nx serve web-ui -c mock|local` (mock for dev, local for testing against Restate server)
- **Build**: `pnpm nx build web-ui`
- **Test**: `pnpm nx test <project>` (e.g., `pnpm nx test ui-button`), add `--watch` for watch mode
- **Single test**: `pnpm nx test <project> --testFile=<file>` or use vitest filtering
- **Lint**: `pnpm nx lint <project>`
- **Typecheck**: `pnpm nx typecheck web-ui`
- **E2E**: `pnpm nx e2e web-ui-e2e`

## Library Generation

### UI Libraries

**React UI Library**

```bash
pnpm nx g @nx/react:lib <NAME> --directory=libs/ui/<NAME> --bundler=none --importPath=@restate/ui/<NAME>
```

**JS UI Library**

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/ui/<NAME> --bundler=none --importPath=@restate/ui/<NAME>
```

### Data Access Libraries

**React Data Access Library**

```bash
pnpm nx g @nx/react:lib <NAME> --directory=libs/data-access/<NAME> --bundler=none --importPath=@restate/data-access/<NAME>
```

**JS Data Access Library**

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/data-access/<NAME> --bundler=none --importPath=@restate/data-access/<NAME>
```

### Feature Libraries

**React Feature Library**

```bash
pnpm nx g @nx/react:lib <NAME> --directory=libs/features/<NAME> --bundler=none --importPath=@restate/features/<NAME>
```

**JS Feature Library**

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/features/<NAME> --bundler=none --importPath=@restate/features/<NAME>
```

### Util Libraries

**React Util Library**

```bash
pnpm nx g @nx/react:lib <NAME> --directory=libs/util/<NAME> --bundler=none --importPath=@restate/util/<NAME>
```

**JS Util Library**

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/util/<NAME> --bundler=none --importPath=@restate/util/<NAME>
```

### Data Access Libraries (JS)

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/data-access/<NAME> --bundler=none --importPath=@restate/data-access/<NAME>
```

### Feature Libraries (React)

```bash
pnpm nx g @nx/react:lib <NAME> --directory=libs/features/<NAME> --bundler=none --importPath=@restate/features/<NAME>
```

### Util Libraries (JS)

```bash
pnpm nx g @nx/js:library <NAME> --directory=libs/util/<NAME> --bundler=none --importPath=@restate/util/<NAME>
```

## Code Style

- **Package manager**: pnpm (monorepo managed by Nx)
- **TypeScript**: Strict mode enabled, use `noUncheckedIndexedAccess`
- **Imports**: Use path aliases (`@restate/ui/*`, `@restate/features/*`, `@restate/data-access/*`, `@restate/util/*`) from tsconfig.base.json
- **Formatting**: Prettier with single quotes, trailing commas, Tailwind plugin
- **Styling**: Tailwind CSS, use `tv()` from `@restate/util/styles` for component variants. Never use string interpolation for dynamic Tailwind classes (e.g., `${isVoid ? 'text-zinc-400' : 'text-gray-500'}`). Always use `tv()` with variants instead.
- **Components**: React 19, React Aria Components for UI primitives, use `forwardRef` for refs
- **Types**: Define props interfaces explicitly, use `PropsWithChildren` when needed
- **Testing**: Vitest + Testing Library, test files use `.spec.tsx` suffix
- **Comments**: NEVER add comments unless explicitly requested by the user
- **Code reuse**: Avoid duplication. When creating similar hooks or components, look for opportunities to reuse existing logic (e.g., if two hooks fetch from the same endpoint, use one hook and access the full response data).

## API Types

- **Regenerate types**: After modifying OpenAPI schemas in `libs/data-access/admin-api/src/lib/api/*.json`, run `pnpm nx create admin-api` to regenerate TypeScript types.
