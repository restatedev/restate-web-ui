import { tv } from '@restate/util/styles';

export const issuePingStyles = tv({
  base: 'absolute inline-flex h-full w-full animate-ping opacity-50',
  variants: {
    severity: {
      high: 'fill-red-300 text-red-300',
      low: 'fill-orange-300 text-orange-300',
    },
  },
});

export const issueIconStyles = tv({
  base: 'relative inline-flex h-full w-full',
  variants: {
    severity: {
      high: 'fill-red-400/80 text-red-400/80',
      low: 'fill-orange-400/80 text-orange-400/80',
    },
  },
});

export const issueDotStyles = tv({
  base: 'relative inline-flex h-2 w-2 rounded-full',
  variants: {
    severity: {
      high: 'bg-red-300',
      low: 'bg-orange-300',
    },
  },
});

export const issueBannerStyles = tv({
  base: 'flex items-center gap-2 rounded-xl border border-zinc-900/80 bg-zinc-800/90 px-3 py-1 text-xs text-gray-200 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-3xl',
  variants: {
    interactive: {
      true: 'hover:bg-zinc-700/90 pressed:bg-zinc-900',
      false: '',
    },
    elevated: {
      true: 'relative z-10',
      false: '',
    },
    full: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    interactive: false,
    elevated: false,
    full: false,
  },
});

export const issueButtonStyles = tv({
  base: 'relative z-10 flex items-center gap-1 self-start rounded-md border px-1.5 py-0.5 text-xs font-medium',
  variants: {
    severity: {
      high: 'border-red-200 bg-red-50 text-red-600',
      low: 'border-orange-200 bg-orange-50 text-orange-600',
    },
  },
  defaultVariants: {
    severity: 'low',
  },
});

export const issueAlertIconStyles = tv({
  base: 'h-3 w-3 shrink-0',
  variants: {
    severity: {
      high: 'fill-red-400 stroke-red-400',
      low: 'fill-orange-400 stroke-orange-400',
    },
  },
});
