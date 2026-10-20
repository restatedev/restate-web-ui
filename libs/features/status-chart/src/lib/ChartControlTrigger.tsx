import type { ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';

const chartControlStyles = tv({
  base: 'inline-flex shrink-0 items-baseline rounded-lg border border-tint-subtle bg-surface/30 px-1.5 py-0.5 text-2xs font-medium text-muted',
  variants: {
    interactive: {
      true: 'group/chart-control gap-0.5 transition-colors hover:border-tint hover:bg-surface/70 hover:text-secondary focus-visible:text-secondary pressed:bg-surface/90',
      false: 'gap-0.5 select-none',
    },
  },
});

export function ChartControlValue({
  children,
  prefix,
  suffix,
}: {
  children: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <span className={chartControlStyles({ interactive: false })}>
      {prefix && <span className="text-subtle">{prefix}</span>}
      {children}
      {suffix && <span className="text-subtle">{suffix}</span>}
    </span>
  );
}

export function ChartControlTrigger({
  children,
  prefix,
  suffix,
}: {
  children: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <Button
      variant="icon"
      className={chartControlStyles({ interactive: true })}
    >
      {prefix && <span className="text-subtle">{prefix}</span>}
      {children}
      <Icon
        name={IconName.ChevronsUpDown}
        className="h-3 w-3 self-center text-subtle transition-colors group-hover/chart-control:text-muted"
      />
      {suffix && <span className="text-subtle">{suffix}</span>}
    </Button>
  );
}

const chartContextStyles = tv({
  base: 'inline-flex shrink-0 items-baseline border-0 bg-transparent p-0 text-2xs font-medium text-subtle shadow-none',
  variants: {
    interactive: {
      true: 'group/chart-context gap-0.5 rounded-md px-1 py-0.5 transition-colors hover:bg-tint-subtle hover:text-tertiary focus-visible:bg-tint-subtle focus-visible:text-tertiary pressed:bg-tint',
      false: 'select-none',
    },
  },
});

export function ChartContextTrigger({ children }: { children: ReactNode }) {
  return (
    <Button
      variant="icon"
      className={chartContextStyles({ interactive: true })}
    >
      {children}
      <Icon
        name={IconName.ChevronsUpDown}
        className="h-2.5 w-2.5 self-center text-muted transition-colors group-hover/chart-context:text-tertiary"
      />
    </Button>
  );
}

export function ChartContextValue({ children }: { children: ReactNode }) {
  return (
    <span className={chartContextStyles({ interactive: false })}>
      {children}
    </span>
  );
}
