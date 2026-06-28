export type LimitsRecent =
  | { type: 'rule'; pattern: string }
  | { type: 'counter'; pattern: string; match: string };

// Keyed by scope — the base path that identifies the environment in Cloud
// (e.g. `/accounts/{id}/environments/{id}`) and is `''` in standalone web-ui.
// Without the key, a remembered rule/counter from one environment would surface
// in another after an in-app environment switch. Mirrors invocationsRecent.
const recentByScope = new Map<string, LimitsRecent>();
const listeners = new Set<() => void>();

export function getLimitsRecent(scope = ''): LimitsRecent | null {
  return recentByScope.get(scope) ?? null;
}

export function setLimitsRecent(item: LimitsRecent, scope = ''): void {
  recentByScope.set(scope, item);
  listeners.forEach((l) => l());
}

export function subscribeLimitsRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
