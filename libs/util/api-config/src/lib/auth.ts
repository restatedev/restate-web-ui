import { getQueryClient } from '@restate/util/react-query';

/**
 * Cache key for the auth token. Apps write via `setAuthToken` on boot
 * (or whenever auth is refreshed); middleware and other call sites
 * read via `getAuthToken`.
 */
export const AUTH_QUERY_KEY = ['auth'] as const;

export interface CachedAuth {
  accessToken?: string;
}

/** Synchronous accessor for the current auth token. */
export function getAuthToken(): string | undefined {
  return getQueryClient().getQueryData<CachedAuth>(AUTH_QUERY_KEY)?.accessToken;
}

/** Write the current auth token; pass `undefined` to clear. */
export function setAuthToken(accessToken: string | undefined): void {
  getQueryClient().setQueryData<CachedAuth>(AUTH_QUERY_KEY, { accessToken });
}
