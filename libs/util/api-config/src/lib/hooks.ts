import { use } from 'react';
import { awaitMeta, getFeatures, getRestateVersion } from './api-config';

const EMPTY_FEATURES = new Set<string>();

/**
 * Suspending hook that returns the current set of enabled features.
 *
 * Suspends the nearest `<Suspense>` boundary while `metaReady` is pending
 * (cold load, or between a meta-context switch and the next `/version`
 * response). Resolves to the active features once meta is ready; returns
 * a stable empty `Set` if no features were persisted.
 *
 * The returned `Set` reference is stable across renders as long as the
 * underlying singleton hasn't been replaced — safe to use in
 * `useMemo`/`useEffect` dependency arrays.
 */
export function useFeatures(): Set<string> {
  use(awaitMeta());
  return getFeatures() ?? EMPTY_FEATURES;
}

/**
 * Suspending hook that returns the Restate server version string.
 *
 * Suspends the nearest `<Suspense>` boundary while `metaReady` is pending.
 * May still return `undefined` after suspension resolves if no version was
 * persisted (rare; primarily a defensive default).
 */
export function useRestateVersion(): string | undefined {
  use(awaitMeta());
  return getRestateVersion();
}
