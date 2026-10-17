import { getQueryClient } from '@restate/util-react-query';
import type {
  Query,
  QueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
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

export function getEnabledFeatures(meta?: MetaSnapshot): string[] {
  return Object.entries(meta?.features ?? {})
    .filter(([, on]) => on)
    .map(([name]) => name);
}

const lastEnabledFeatures = new WeakMap<QueryClient, Map<string, string>>();

/**
 * The meta snapshot is persisted across sessions so `/query/*` requests
 * can use last session's server features immediately instead of waiting
 * for `/version` (no startup waterfall). Features rarely change, but when
 * they do (server upgrade/downgrade, a feature toggled off), queries sent
 * with the restored flags may target tables the server no longer has.
 *
 * Called for every successful query: when a `meta` snapshot's enabled
 * features differ from the previous one for the same base URL (typically
 * the restored snapshot followed by the fresh `/version`), reset the
 * `/query/*` queries that already failed or are still in flight with the
 * old flags, so they rerun with the new ones. Queries that succeeded are
 * left alone.
 */
export function retryQueryHandlersOnFeatureChange<TError>(
  queryClient: QueryClient,
  data: unknown,
  query: Query<unknown, TError, unknown, readonly unknown[]>,
) {
  const [scope, baseUrl] = query.queryKey;
  if (scope !== 'meta' || typeof baseUrl !== 'string') {
    return;
  }
  const seen = lastEnabledFeatures.get(queryClient) ?? new Map();
  lastEnabledFeatures.set(queryClient, seen);
  const features = getEnabledFeatures(data as MetaSnapshot)
    .sort()
    .join(',');
  const previous = seen.get(baseUrl);
  seen.set(baseUrl, features);
  if (previous === undefined || previous === features) {
    return;
  }

  // `reset()` cancels in-flight fetches. Each query is reset by its own key
  // because `resetQueries` re-applies its filter for the refetch step after
  // resetting, when no query is `error`/`fetching` any more, so a status
  // predicate there would refetch nothing.
  queryClient
    .getQueryCache()
    .findAll({
      predicate: ({ queryKey: [path], state }) =>
        typeof path === 'string' &&
        path.startsWith('/query/') &&
        (state.status === 'error' || state.fetchStatus === 'fetching'),
    })
    .forEach(({ queryKey }) => {
      void queryClient.resetQueries({ queryKey, exact: true });
    });
}

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
