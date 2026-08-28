import { IconName } from '@restate/ui/icons';
import { PanelTableQuickOpen } from '@restate/ui/table';
import {
  type VirtualObjectOpenDraft,
  virtualObjectIdentityFromOpenDraft,
} from './virtual-objects.open';

export interface VirtualObjectQuickOpenProps {
  draft: VirtualObjectOpenDraft;
  disabled: boolean;
  hasScopedVirtualObjects: boolean;
  onChange: (draft: VirtualObjectOpenDraft) => void;
  onOpen: VoidFunction;
  service: string;
}

export function VirtualObjectQuickOpen({
  draft,
  disabled,
  hasScopedVirtualObjects,
  onChange,
  onOpen,
  service,
}: VirtualObjectQuickOpenProps) {
  const identity = virtualObjectIdentityFromOpenDraft(
    service,
    draft,
    hasScopedVirtualObjects,
  );

  return (
    <PanelTableQuickOpen
      ariaLabel="Go to a Virtual Object instance"
      label="Go to instance"
      iconName={IconName.VirtualObject}
      inputLabel="Key"
      placeholder="Key"
      value={draft.key}
      onChange={(key) => onChange({ ...draft, key })}
      onOpen={onOpen}
      isValid={Boolean(identity)}
      disabled={disabled}
      scope={
        hasScopedVirtualObjects
          ? {
              value: draft.scope,
              onChange: (scope) => onChange({ ...draft, scope }),
            }
          : undefined
      }
    />
  );
}
