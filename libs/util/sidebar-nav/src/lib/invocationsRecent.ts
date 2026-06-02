export type InvocationsRecent =
  | { type: 'custom'; value: string }
  | { type: 'invocation'; value: string };

// Keyed by scope — the invocations base path, which identifies the environment
// in Cloud (e.g. `/accounts/{id}/environments/{id}`) and is `''` in standalone
// web-ui. Without the key, a remembered invocation/query from one environment
// would surface in another after an in-app environment switch.
const recentByScope = new Map<string, InvocationsRecent>();
const listeners = new Set<() => void>();

export function getInvocationsRecent(scope = ''): InvocationsRecent | null {
  return recentByScope.get(scope) ?? null;
}

export function setInvocationsRecent(item: InvocationsRecent, scope = ''): void {
  recentByScope.set(scope, item);
  listeners.forEach((l) => l());
}

export function subscribeInvocationsRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
