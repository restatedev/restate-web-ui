import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';

export const cardContainerStyles = tv({
  extend: focusRing,
  base: '@container relative cursor-default rounded-xl outline-none',
});

export const cardInnerStyles = tv({
  base: 'relative overflow-hidden rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 shadow-xs shadow-zinc-800/3 transition hover:border-gray-200 hover:shadow-sm hover:shadow-zinc-800/4',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-orange-500/8%)_8px,--theme(--color-orange-500/8%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-orange-500/12%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-red-500/8%)_8px,--theme(--color-red-500/8%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-red-500/12%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

export type IssueSeverity = 'none' | 'low' | 'high';
