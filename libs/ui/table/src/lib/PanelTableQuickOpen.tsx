import { ReactNode } from 'react';
import { Input, Label, TextField } from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui/chip';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

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
      <span className="flex shrink-0 items-center gap-1.5 font-medium text-zinc-700">
        <Icon name={iconName} className="h-3.5 w-3.5 text-zinc-400" />
        {label}
      </span>
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-zinc-300/80" />
      <ChipGroup className="w-full max-w-xl flex-1 items-center">
        {scope && (
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
                value={scope.value}
                onChange={scope.onChange}
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
          left={scope ? 'angled' : 'straight'}
          right="straight"
          size="lg"
          className="w-full focus-within:outline-none [&>[data-chip-segment]]:flex-1"
          containerClassName="min-w-48 max-w-80 flex-1 has-[input[data-focused=true]]:[--chip-border-color:var(--color-blue-400)] has-[input[data-focus-visible=true]]:filter-[drop-shadow(0_0_2px_--theme(--color-blue-400/35%))]"
        >
          <ChipSegment className="w-full bg-white pr-0 pl-3">
            <Icon
              name={iconName}
              className="h-3.5 w-3.5 shrink-0 text-zinc-400"
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
                className="h-full w-full min-w-0 border-0 bg-transparent py-0 pr-2.5 pl-0 font-mono text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-0 focus:outline-hidden disabled:text-zinc-400"
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

const quickOpenToolbarStyles = tv({
  slots: {
    wrapper: 'mx-4 -mb-8',
    toolbar:
      'border-0 bg-transparent p-0 shadow-none backdrop-blur-none supports-[-moz-appearance:none]:bg-transparent',
  },
  variants: {
    hasNotice: {
      true: { wrapper: 'h-[4.75rem]' },
      false: { wrapper: 'h-9' },
    },
  },
});

export function panelTableQuickOpenToolbarClassNames(hasNotice: boolean) {
  const { wrapper, toolbar } = quickOpenToolbarStyles({ hasNotice });
  return { wrapper: wrapper(), toolbar: toolbar() };
}

export function PanelTableQuickOpenToolbar({
  notice,
  children,
}: {
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-1">
      {notice}
      <div className="flex h-9 w-full shrink-0 items-center rounded-xl bg-zinc-200/45 px-2.5 text-xs supports-[-moz-appearance:none]:bg-zinc-200/65">
        {children}
      </div>
    </div>
  );
}
