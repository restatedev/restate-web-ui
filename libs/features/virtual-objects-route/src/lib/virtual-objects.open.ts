import type { VirtualObjectInstanceIdentity } from '@restate/features/virtual-object-instance';

export interface VirtualObjectOpenDraft {
  key: string;
  scope: string;
}

export function virtualObjectIdentityFromOpenDraft(
  service: string,
  draft: VirtualObjectOpenDraft,
  hasScopedVirtualObjects: boolean,
): VirtualObjectInstanceIdentity | undefined {
  const key = draft.key.trim();
  if (!key) return undefined;
  const scope = draft.scope.trim();
  return {
    service,
    key,
    ...(hasScopedVirtualObjects && scope ? { scope } : {}),
  };
}
