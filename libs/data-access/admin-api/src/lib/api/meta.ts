import { getQueryClient } from '@restate/util/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { adminApi } from './adminApi';

/**
 * Snapshot of the server's meta — `/version` plus anything else we
 * might fold in later. Kept under its own queryKey so future fields
 * have a stable home.
 */
export interface MetaSnapshot {
  version?: string;
  /** Raw flags; the middleware filters to enabled names when building the header. */
  features?: Record<string, boolean>;
}

function resolveBaseUrl(baseUrl: string): string {
  return baseUrl === '' && typeof window !== 'undefined'
    ? window.location.origin
    : baseUrl;
}

export const metaQueryKey = (baseUrl: string) =>
  ['meta', resolveBaseUrl(baseUrl)] as const;

/** App-registered fallback. Surfaced as `placeholderData` and as a graceful-failure value. */
let metaFallback: MetaSnapshot = {};
export function setMetaFallback(meta: MetaSnapshot): void {
  metaFallback = meta;
}

/**
 * App-registered per-query persister
 * (`experimental_createQueryPersister(...).persisterFn`). Backs the
 * meta cache with cross-session storage (localStorage / cookie / …).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MetaPersisterFn = (...args: any[]) => any;

let metaPersister: MetaPersisterFn | undefined;
export function setMetaPersister(p: MetaPersisterFn): void {
  metaPersister = p;
}

async function fetchMeta(baseUrl: string): Promise<MetaSnapshot> {
  try {
    const data = await getQueryClient().ensureQueryData(
      adminApi('query', '/version', 'get', { baseUrl }),
    );
    return { version: data?.version, features: data?.features };
  } catch {
    // Network/auth failure — degrade to fallback so callers always
    // get a valid snapshot.
    return metaFallback;
  }
}

/**
 * `placeholderData` (not `initialData`) is the key choice here: it's
 * returned by `useQuery` while pending but is NOT written to the cache,
 * so `ensureQueryData` and the persister still see an empty slot and
 * run the queryFn/restore-from-storage path. `staleTime: Infinity`
 * keeps the resolved snapshot pinned for the rest of the session.
 */
export function metaQueryOptions(
  baseUrl: string,
): UseQueryOptions<
  MetaSnapshot,
  Error,
  MetaSnapshot,
  ReturnType<typeof metaQueryKey>
> {
  return {
    queryKey: metaQueryKey(baseUrl),
    queryFn: () => fetchMeta(resolveBaseUrl(baseUrl)),
    placeholderData: metaFallback,
    staleTime: Infinity,
    ...(metaPersister
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { persister: metaPersister as any }
      : {}),
  };
}
