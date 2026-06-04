import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// `true` once the app has hydrated; `false` on the server and the first client
// (hydration) render, so it matches the server HTML and never causes a mismatch.
// Gate content that can't be server-rendered (portals, browser-only widgets) on
// this and show a server-safe placeholder until it flips to `true`. Components
// mounted after the initial hydration (e.g. by client navigation) skip the
// server snapshot and read `true` immediately.
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
