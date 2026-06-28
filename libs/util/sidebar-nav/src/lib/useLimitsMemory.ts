import { useCallback, useSyncExternalStore } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getLimitsRecent,
  setLimitsRecent,
  subscribeLimitsRecent,
  type LimitsRecent,
} from './limitsRecent';

// The store scope is the environment, identified by the RestateContext
// `baseUrl` (`/accounts/{id}/environments/{id}` in Cloud, `''` in standalone
// web-ui — the context default, so this is safe even outside a provider).
export function useLimitsRecent(): {
  recent: LimitsRecent | null;
  setRecent: (item: LimitsRecent) => void;
} {
  const { baseUrl: scope } = useRestateContext();
  const recent = useSyncExternalStore(
    subscribeLimitsRecent,
    () => getLimitsRecent(scope),
    // "Recent" is client-only navigation memory; the server never has one (and
    // its module state is shared across requests), so the SSR snapshot is null.
    () => null,
  );
  const setRecent = useCallback(
    (item: LimitsRecent) => setLimitsRecent(item, scope),
    [scope],
  );
  return { recent, setRecent };
}
