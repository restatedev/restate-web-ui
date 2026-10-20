import { ReactNode } from 'react';
import { Input, Label, TextField } from 'react-aria-components';
import { Button } from '@restate/ui-button';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui-chip';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';

export interface PanelTableQuickOpenScope {
  value: string;
  onChange: (value: string) => void;
}

export interface PanelTableQuickOpenProps {
  ariaLabel: string;
  label: string;
  iconName: IconName;
  inputLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onOpen: VoidFunction;
  isValid: boolean;
  disabled?: boolean;
  scope?: PanelTableQuickOpenScope;
}

export function PanelTableQuickOpen({
  ariaLabel,
  label,
  iconName,
  inputLabel,
  placeholder,
  value,
  onChange,
  onOpen,
  isValid,
  disabled = false,
  scope,
}: PanelTableQuickOpenProps) {
  return (
    <form
      aria-label={ariaLabel}
      className="flex w-full min-w-0 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid) onOpen();
      }}
    >
      <span className="flex shrink-0 items-center gap-1.5 font-medium text-secondary">
        <Icon name={iconName} className="h-3.5 w-3.5 text-subtle" />
        {label}
      </span>
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-strong/80" />
      <ChipGroup className="w-full max-w-xl flex-1 items-center">
        {scope && (
          <Chip
            left="straight"
            right="angled"
            size="lg"
            className="w-full focus-within:outline-none [&>[data-chip-segment]]:flex-1"
            containerClassName="w-48 shrink-0 has-[input[data-focused=true]]:[--chip-border-color:var(--border-color-accent-strong)] has-[input[data-focus-visible=true]]:filter-[drop-shadow(0_0_2px_--theme(--border-color-accent-strong/35%))]"
          >
            <ChipSegment className="w-full bg-muted pr-0 pl-1.5">
              <span className="inline-flex h-4 shrink-0 items-center rounded border border-strong/80 bg-surface/80 px-1 text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-muted">
                SCOPE
              </span>
              <TextField
                className="flex min-w-0 flex-1 items-center"
                isDisabled={disabled}
                value={scope.value}
                onChange={scope.onChange}
              >
                <Label className="sr-only">Scope (optional)</Label>
                <Input
                  placeholder="optional"
                  className="h-full w-full min-w-0 border-0 bg-transparent py-0 pr-3 pl-0 font-mono text-xs text-secondary outline-none placeholder:font-sans placeholder:text-subtle focus:ring-0 focus:outline-hidden disabled:text-subtle"
                />
              </TextField>
            </ChipSegment>
          </Chip>
        )}
        <Chip
          left={scope ? 'angled' : 'straight'}
          right="straight"
          size="lg"
          className="w-full shadow-none focus-within:outline-none [&>[data-chip-segment]]:flex-1"
          containerClassName="min-w-48 max-w-80 flex-1 has-[input[data-focused=true]]:[--chip-border-color:var(--border-color-accent-strong)] has-[input[data-focus-visible=true]]:filter-[drop-shadow(0_0_2px_--theme(--border-color-accent-strong/35%))]"
        >
          <ChipSegment className="w-full bg-surface pr-0 pl-3">
            <Icon
              name={iconName}
              className="h-3.5 w-3.5 shrink-0 text-subtle"
            />
            <TextField
              className="flex min-w-0 flex-1 items-center"
              isDisabled={disabled}
              isRequired
              value={value}
              onChange={onChange}
            >
              <Label className="sr-only">{inputLabel}</Label>
              <Input
                placeholder={placeholder}
                className="h-full w-full min-w-0 border-0 bg-transparent py-0 pr-2.5 pl-0 font-mono text-xs text-secondary outline-none placeholder:font-sans placeholder:text-subtle focus:ring-0 focus:outline-hidden disabled:text-subtle"
              />
            </TextField>
          </ChipSegment>
        </Chip>
        <HoverTooltip content={label} className="ml-1 shrink-0">
          <Button
            type="submit"
            variant="primary"
            aria-label={label}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0"
            disabled={disabled || !isValid}
          >
            <Icon name={IconName.ArrowRight} className="h-3 w-3" />
          </Button>
        </HoverTooltip>
      </ChipGroup>
    </form>
  );
}

export function PanelTableQuickOpenCaption({
  notice,
  children,
}: {
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-panel-table-quick-open-caption
      className="mx-4 mt-11 mb-1 flex min-w-0 flex-col gap-1"
    >
      {notice}
      <div className="flex h-9 w-full shrink-0 items-center rounded-xl bg-emphasis/30 px-2.5 text-xs supports-[-moz-appearance:none]:bg-emphasis/40">
        {children}
      </div>
    </div>
  );
}
