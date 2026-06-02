import type { QueryClient } from '@tanstack/react-query';

let registered: QueryClient | undefined;

/**
 * Register the app-wide `QueryClient` exactly once at boot. The same
 * instance you pass to `<QueryProvider>` should be passed here so
 * libraries that aren't inside the React tree (the admin-api
 * middleware in particular) can reach the cache without DI or
 * resolver callbacks.
 *
 * This is a deliberate cross-lib singleton. Every app in this repo
 * uses exactly one `QueryClient`; embedding it via
 * `QueryClientProvider` context alone wouldn't help non-render code
 * paths (e.g. `openapi-fetch` `onRequest` middleware).
 */
export function setQueryClient(qc: QueryClient): void {
  registered = qc;
}

/**
 * Returns the registered app-wide `QueryClient`. Throws if the app
 * hasn't called `setQueryClient` yet — that's a programming error
 * and we'd rather fail loudly than silently dropping queries / cache
 * lookups.
 */
export function getQueryClient(): QueryClient {
  if (!registered) {
    throw new Error(
      '@restate/util/react-query: queryClient not registered. ' +
        'Call setQueryClient(queryClient) at app boot before any ' +
        'admin-api request fires.',
    );
  }
  return registered;
}
