import { Button } from '@restate/ui/button';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui/chip';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Input, Label, TextField } from 'react-aria-components';
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
    <form
      aria-label="Open a Virtual Object instance"
      className="flex w-full min-w-0 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (identity) onOpen();
      }}
    >
      <span className="flex shrink-0 items-center gap-1.5 font-medium text-zinc-700">
        <Icon
          name={IconName.VirtualObject}
          className="h-3.5 w-3.5 text-zinc-400"
        />
        Open instance
      </span>
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-zinc-300/80" />
      <ChipGroup className="w-full max-w-xl flex-1 items-center">
        {hasScopedVirtualObjects && (
          <Chip
            left="straight"
            right="angled"
            size="lg"
            className="w-full focus-within:outline-none [&>[data-chip-segment]]:flex-1"
            containerClassName="w-48 shrink-0 has-[input[data-focused=true]]:[--chip-border-color:var(--color-blue-400)] has-[input[data-focus-visible=true]]:filter-[drop-shadow(0_0_2px_--theme(--color-blue-400/35%))]"
          >
            <ChipSegment className="w-full bg-zinc-100 pr-0 pl-1.5">
              <span className="inline-flex h-4 shrink-0 items-center rounded border border-zinc-300/80 bg-white/80 px-1 text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-zinc-500">
                SCOPE
              </span>
              <TextField
                className="flex min-w-0 flex-1 items-center"
                isDisabled={disabled}
                value={draft.scope}
                onChange={(scope) => onChange({ ...draft, scope })}
              >
                <Label className="sr-only">Scope (optional)</Label>
                <Input
                  placeholder="optional"
                  className="h-full w-full min-w-0 border-0 bg-transparent py-0 pr-3 pl-0 font-mono text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-0 focus:outline-hidden disabled:text-zinc-400"
                />
              </TextField>
            </ChipSegment>
          </Chip>
        )}
        <Chip
          left={hasScopedVirtualObjects ? 'angled' : 'straight'}
          right="straight"
          size="lg"
          className="w-full focus-within:outline-none [&>[data-chip-segment]]:flex-1"
          containerClassName="min-w-48 max-w-80 flex-1 has-[input[data-focused=true]]:[--chip-border-color:var(--color-blue-400)] has-[input[data-focus-visible=true]]:filter-[drop-shadow(0_0_2px_--theme(--color-blue-400/35%))]"
        >
          <ChipSegment className="w-full bg-white pr-0 pl-3">
            <Icon
              name={IconName.VirtualObject}
              className="h-3.5 w-3.5 shrink-0 text-zinc-400"
            />
            <TextField
              className="flex min-w-0 flex-1 items-center"
              isDisabled={disabled}
              isRequired
              value={draft.key}
              onChange={(key) => onChange({ ...draft, key })}
            >
              <Label className="sr-only">Key</Label>
              <Input
                placeholder="Key"
                className="h-full w-full min-w-0 border-0 bg-transparent py-0 pr-2.5 pl-0 font-mono text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-0 focus:outline-hidden disabled:text-zinc-400"
              />
            </TextField>
          </ChipSegment>
        </Chip>
        <HoverTooltip content="Open instance" className="ml-1 shrink-0">
          <Button
            type="submit"
            variant="primary"
            aria-label="Open instance"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0"
            disabled={disabled || !identity}
          >
            <Icon name={IconName.ArrowRight} className="h-3 w-3" />
          </Button>
        </HoverTooltip>
      </ChipGroup>
    </form>
  );
}
