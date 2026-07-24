import type { ReactNode } from 'react';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';

const chartControlStyles = tv({
  base: 'inline-flex shrink-0 items-baseline rounded-lg border border-black/[0.05] bg-white/35 px-1.5 py-0.5 text-2xs font-medium text-zinc-500',
  variants: {
    interactive: {
      true: 'group/chart-control gap-0.5 transition-colors hover:border-black/10 hover:bg-white/70 hover:text-zinc-700 focus-visible:text-zinc-700 pressed:bg-white/90',
      false: 'select-none',
    },
  },
});

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
      {prefix && <span className="text-zinc-400">{prefix}</span>}
      {children}
      <Icon
        name={IconName.ChevronsUpDown}
        className="h-3 w-3 self-center text-zinc-400 transition-colors group-hover/chart-control:text-zinc-500"
      />
      {suffix && <span className="text-zinc-400">{suffix}</span>}
    </Button>
  );
}

const chartContextStyles = tv({
  base: 'inline-flex shrink-0 items-baseline border-0 bg-transparent p-0 text-2xs font-medium text-zinc-400 shadow-none',
  variants: {
    interactive: {
      true: 'group/chart-context gap-0.5 rounded-md px-1 py-0.5 transition-colors hover:bg-black/[0.035] hover:text-zinc-600 focus-visible:bg-black/[0.035] focus-visible:text-zinc-600 pressed:bg-black/[0.07]',
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
        className="h-2.5 w-2.5 self-center text-zinc-500 transition-colors group-hover/chart-context:text-zinc-600"
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
