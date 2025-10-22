# Agent Guidelines for Restate Web UI

## Commands

- **Dev**: `pnpm nx serve web-ui -c mock|local` (mock for dev, local for testing against Restate server)
- **Build**: `pnpm nx build web-ui`
- **Test**: `pnpm nx test <project>` (e.g., `pnpm nx test ui-button`), add `--watch` for watch mode
- **Single test**: `pnpm nx test <project> --testFile=<file>` or use vitest filtering
- **Lint**: `pnpm nx lint <project>`
- **Typecheck**: `pnpm nx typecheck web-ui`
- **E2E**: `pnpm nx e2e web-ui-e2e`

## Code Style

- **Package manager**: pnpm (monorepo managed by Nx)
- **TypeScript**: Strict mode enabled, use `noUncheckedIndexedAccess`
- **Imports**: Use path aliases (`@restate/ui/*`, `@restate/features/*`, `@restate/data-access/*`, `@restate/util/*`) from tsconfig.base.json
- **Formatting**: Prettier with single quotes, trailing commas, Tailwind plugin
- **Styling**: Tailwind CSS, use `tv()` from `@restate/util/styles` for component variants
- **Components**: React 19, React Aria Components for UI primitives, use `forwardRef` for refs
- **Types**: Define props interfaces explicitly, use `PropsWithChildren` when needed
- **Testing**: Vitest + Testing Library, test files use `.spec.tsx` suffix
- **Comments**: NEVER add comments unless explicitly requested by the user
