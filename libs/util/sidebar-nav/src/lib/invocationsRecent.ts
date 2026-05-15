export type InvocationsRecent =
  | { type: 'custom'; value: string }
  | { type: 'invocation'; value: string };

let recent: InvocationsRecent | null = null;
const listeners = new Set<() => void>();

export function getInvocationsRecent(): InvocationsRecent | null {
  return recent;
}

export function setInvocationsRecent(item: InvocationsRecent): void {
  recent = item;
  listeners.forEach((l) => l());
}

export function subscribeInvocationsRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
