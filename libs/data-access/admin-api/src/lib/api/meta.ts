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

export const metaQueryKey = (baseUrl: string) => ['meta', baseUrl] as const;

/** App-registered fallback. Persisted into the cache as `initialData`. */
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
  const data = await getQueryClient().ensureQueryData(
    adminApi('query', '/version', 'get', { baseUrl }),
  );
  return { version: data?.version, features: data?.features };
}

/**
 * `initialData` + `initialDataUpdatedAt: 0` → fallback returned
 * immediately but treated as stale, so `queryFn` still fires once.
 * `staleTime: Infinity` → no further refetches.
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
    queryFn: () => fetchMeta(baseUrl),
    initialData: metaFallback,
    initialDataUpdatedAt: 0,
    staleTime: Infinity,
    ...(metaPersister
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { persister: metaPersister as any }
      : {}),
  };
}
