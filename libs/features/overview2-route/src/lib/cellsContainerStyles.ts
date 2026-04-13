import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';

export const cellsContainerStyles = tv({
  extend: focusRing,
  base: '@container cursor-default overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs ring-1 ring-white transition ring-inset',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-0 before:animate-stripeScroll before:rounded-2xl before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-orange-500/4%)_8px,--theme(--color-orange-500/4%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-orange-500/10%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-0 before:animate-stripeScroll before:rounded-2xl before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-red-500/4%)_8px,--theme(--color-red-500/4%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-red-500/10%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});
