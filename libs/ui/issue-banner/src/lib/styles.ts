import { tv } from '@restate/util-styles';

export const issuePingStyles = tv({
  base: 'absolute inline-flex h-full w-full animate-ping opacity-50',
  variants: {
    severity: {
      // `!` so descendant fill overrides (e.g. tabStyles' [&_svg]:fill-muted)
      // don't clobber the alert color when nested inside one.
      high: 'fill-danger-strong! text-danger-subtle',
      low: 'fill-warning-strong! text-warning-subtle',
    },
  },
});

export const issueIconStyles = tv({
  base: 'relative inline-flex h-full w-full',
  variants: {
    severity: {
      high: 'fill-danger-vivid/80 text-danger-subtle',
      low: 'fill-warning-vivid/80 text-warning-subtle',
    },
  },
});

export const issueDotStyles = tv({
  base: 'relative inline-flex h-2 w-2 rounded-full',
  variants: {
    severity: {
      high: 'bg-danger-strong',
      low: 'bg-warning-strong',
    },
  },
});

export const issueBannerStyles = tv({
  base: 'flex items-center gap-2 rounded-xl border border-inverse bg-inverse/90 px-3 py-1 text-xs text-inverse-secondary shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)] drop-shadow-xl backdrop-blur-3xl',
  variants: {
    interactive: {
      true: 'hover:bg-inverse-muted/90 pressed:bg-inverse',
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
  base: 'relative z-10 flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
  variants: {
    severity: {
      high: 'border-danger bg-danger-subtle text-danger',
      low: 'border-warning bg-warning-subtle text-warning',
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
      // `!` (important) so descendant fill overrides on containers like the
      // tabs (`[&_svg]:fill-muted`) can't clobber the alert color.
      high: 'fill-danger-strong! stroke-danger-strong',
      low: 'fill-warning-strong! stroke-warning-strong',
    },
  },
});
