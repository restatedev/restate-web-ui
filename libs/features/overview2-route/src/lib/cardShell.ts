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
      low: 'bg-[linear-gradient(to_right,--theme(--color-orange-50)_0,white_4rem)]',
      high: 'bg-[linear-gradient(to_right,--theme(--color-red-50)_0,white_4rem)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

export type IssueSeverity = 'none' | 'low' | 'high';
