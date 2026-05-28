import { createCookie, type CookieOptions } from 'react-router';
import {
  markMetaReady,
  resetMetaReady,
  setFeatures,
  setRestateVersion,
} from './api-config';

export interface RestateMeta {
  version?: string;
  features?: Record<string, boolean>;
}

/**
 * A meta-storage instance moves meta between a persistent backing
 * (cookie / localStorage) and the api-config singletons.
 *
 * - `read` parses the backing into a `RestateMeta`. Pure: it does not
 *   touch any singletons, so it is safe to call from server contexts
 *   (e.g. a Cloudflare Worker loader).
 * - `hydrate` reads from the backing and mirrors the result into the
 *   singletons authoritatively — including clearing them when the
 *   backing is empty. Resets `metaReady` first; marks it ready only if
 *   the stored meta contains a version.
 * - `persist` writes meta to the backing and mirrors it into the
 *   singletons. Marks `metaReady` only if the persisted meta contains a
 *   version; callers that want to clear should use `clearMeta` instead.
 *
 * Cookie storage uses `document.cookie` on the client. On the server,
 * pass the request `Cookie` header to `read` / `hydrate`, and a response
 * `Headers` to `persist` to receive a `Set-Cookie` entry.
 */
export interface MetaStorage {
  read(cookieHeader?: string | null): Promise<RestateMeta | undefined>;
  hydrate(cookieHeader?: string | null): Promise<RestateMeta>;
  persist(meta: RestateMeta, responseHeaders?: Headers): Promise<void>;
}

type ReadFn = (
  cookieHeader?: string | null,
) => RestateMeta | undefined | Promise<RestateMeta | undefined>;
type WriteFn = (
  meta: RestateMeta,
  responseHeaders?: Headers,
) => void | Promise<void>;

function buildStorage(read: ReadFn, write: WriteFn): MetaStorage {
  async function safeRead(cookieHeader?: string | null) {
    try {
      return (await read(cookieHeader)) ?? undefined;
    } catch {
      // treat read errors as a cold load
      return undefined;
    }
  }

  return {
    read: safeRead,
    async hydrate(cookieHeader) {
      resetMetaReady();
      const meta = (await safeRead(cookieHeader)) ?? {};
      setRestateVersion(meta.version);
      setFeatures(
        meta.features ? enabledFeatureNames(meta.features) : undefined,
      );
      if (meta.version) {
        markMetaReady();
      }
      return meta;
    },
    async persist(meta, responseHeaders) {
      setRestateVersion(meta.version);
      setFeatures(
        meta.features ? enabledFeatureNames(meta.features) : undefined,
      );
      if (meta.version) {
        markMetaReady();
      }
      await write(meta, responseHeaders);
    },
  };
}

function enabledFeatureNames(features: Record<string, boolean>): Set<string> {
  return new Set(
    Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
  );
}

const DEFAULT_COOKIE_NAME = 'restate-meta';
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function createLocalStorageMetaStorage(
  key = DEFAULT_COOKIE_NAME,
): MetaStorage {
  return buildStorage(
    () => {
      if (typeof localStorage === 'undefined') return undefined;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return undefined;
        return parsed as RestateMeta;
      } catch {
        return undefined;
      }
    },
    (meta) => {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(key, JSON.stringify(meta));
      } catch {
        // quota / disabled storage / private mode — best-effort cache
      }
    },
  );
}

/**
 * All `createCookie` options pass through to the underlying cookie. `path`
 * is required (used for per-env scoping in multi-env contexts). `name`
 * controls the cookie name; defaults to `'restate-meta'`.
 *
 * Defaults applied when not provided by the caller:
 * - `maxAge`: 30 days
 * - `sameSite`: `'lax'`
 * - `secure`: `true` on https, `false` otherwise
 */
export type CookieMetaStorageOptions = CookieOptions & {
  path: string;
  name?: string;
};

export function createCookieMetaStorage(
  options: CookieMetaStorageOptions,
): MetaStorage {
  const { name = DEFAULT_COOKIE_NAME, ...cookieOptions } = options;
  const cookie = createCookie(name, {
    maxAge: DEFAULT_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: typeof location !== 'undefined' && location.protocol === 'https:',
    ...cookieOptions,
  });

  return buildStorage(
    async (cookieHeader) => {
      const source =
        cookieHeader === undefined
          ? typeof document !== 'undefined'
            ? document.cookie
            : null
          : cookieHeader;
      if (!source) return undefined;
      try {
        const parsed = await cookie.parse(source);
        if (!parsed || typeof parsed !== 'object') return undefined;
        return parsed as RestateMeta;
      } catch {
        return undefined;
      }
    },
    async (meta, responseHeaders) => {
      try {
        const serialized = await cookie.serialize(meta);
        if (responseHeaders) {
          responseHeaders.append('Set-Cookie', serialized);
        } else if (typeof document !== 'undefined') {
          document.cookie = serialized;
        }
      } catch {
        // best-effort cache
      }
    },
  );
}
