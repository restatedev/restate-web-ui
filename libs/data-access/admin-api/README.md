# data-access-admin-api

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test data-access-admin-api` to execute the unit tests via [Vitest](https://vitest.dev/).

## Server meta and feature flags

The server's `/version` response (version + `features`) is cached as the
**meta** query (`['meta', baseUrl]`, `metaQueryOptions` in
`src/lib/api/meta.ts`). Two consumers read it, at different times:

| Consumer                                                                                     | When it reads meta                                                                                          | What it does with it                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request middleware (`middleware.ts`)                                                         | Per `/query/*` request, via `ensureQueryData` — **waits** for `/version` the first time a `baseUrl` is seen | Sets `x-restate-version`, `x-restate-features` and `x-restate-ui-features` (UI flags whose server feature is on, `getEnabledUiFeatures` in `uiFeatures.ts`). The in-browser query handlers pick tables from these headers.             |
| Hooks (`useFeatures`, `useQueryHandlerFeatures`, e.g. `useCanSummarizeInvocationsFromStats`) | At render, via `useQuery` — **does not wait**; returns the placeholder until meta resolves                  | Decides which requests to send (e.g. one stats-backed `view: all` instead of stages + breakdowns + inbox). `useQueryHandlerFeatures` builds the same feature set the handlers will see (server features + `ui:` flags), so both agree. |

Caching (`apps/web-ui/app/root.tsx`):

- `setMetaFallback({ version: '9999999.0.0' })` is the placeholder: a version
  but **no features**.
- `setMetaPersister(...)` persists meta in `localStorage` (`restate-meta*`,
  30 days, refetched on restore).

Consequence: on the **very first load** for a `baseUrl` (nothing persisted
yet) hooks render once with no features and may pick the non-stats/non-index
plan, then re-render with the real features and send the right requests. The
handlers still answer the early requests correctly, because the middleware
waited for `/version`; the cost is a few redundant reads, once. Measured on
the invocations page with a service filter: first load 4 `sys_service_stats`
reads, every later load 1. We accept this rather than gating hooks on
`isPlaceholderData`.

When adding a hook that branches on server or UI features, read them through
`useFeatures` / `useQueryHandlerFeatures`, and keep the decision in a pure
function shared with the query handler (e.g. `canSummarizeInvocationsFromStats`)
so the hook and the handler cannot disagree.
