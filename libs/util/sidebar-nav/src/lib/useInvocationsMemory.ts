import { useCallback, useSyncExternalStore } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getInvocationsRecent,
  setInvocationsRecent,
  subscribeInvocationsRecent,
  type InvocationsRecent,
} from './invocationsRecent';
import {
  getInvocationsLastQuery,
  saveInvocationsLastQuery,
} from './invocationsLastQuery';

// The store scope is the environment, identified by the RestateContext
// `baseUrl` (`/accounts/{id}/environments/{id}` in Cloud, `''` in standalone
// web-ui — the context default, so this is safe even outside a provider). The
// invocations `clientLoader` can't use this hook (runs outside React), so it
// derives the same key from the request URL instead.
export function useInvocationsRecent(): {
  recent: InvocationsRecent | null;
  setRecent: (item: InvocationsRecent) => void;
} {
  const { baseUrl: scope } = useRestateContext();
  const recent = useSyncExternalStore(
    subscribeInvocationsRecent,
    () => getInvocationsRecent(scope),
    // "Recent" is client-only navigation memory; the server never has one (and
    // its module state is shared across requests), so the SSR snapshot is null.
    // That matches the fresh-module client value at hydration.
    () => null,
  );
  const setRecent = useCallback(
    (item: InvocationsRecent) => setInvocationsRecent(item, scope),
    [scope],
  );
  return { recent, setRecent };
}

export function useInvocationsLastQuery(): {
  getLastQuery: () => URLSearchParams | null;
  saveLastQuery: (searchParams: URLSearchParams) => void;
} {
  const { baseUrl: scope } = useRestateContext();
  const getLastQuery = useCallback(
    () => getInvocationsLastQuery(scope),
    [scope],
  );
  const saveLastQuery = useCallback(
    (searchParams: URLSearchParams) =>
      saveInvocationsLastQuery(searchParams, scope),
    [scope],
  );
  return { getLastQuery, saveLastQuery };
}
