import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';

export const cardContainerStyles = tv({
  extend: focusRing,
  base: '@container relative cursor-default rounded-xl',
});

export const cardInnerStyles = tv({
  base: 'relative overflow-hidden rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 shadow-xs shadow-zinc-800/3 transition',
  variants: {
    issueSeverity: {
      none: '',
      low: 'bg-[linear-gradient(to_right,--theme(--color-orange-50)_0,white_4rem)]',
      high: 'bg-[linear-gradient(to_right,--theme(--color-red-50)_0,white_4rem)]',
    },
    isHovered: {
      true: 'border-gray-200 shadow-sm shadow-zinc-800/4',
    },
    isPressed: {
      true: 'border-gray-300 shadow-none',
    },
  },
  compoundVariants: [
    { issueSeverity: 'none', isHovered: true, className: 'bg-gray-100' },
    {
      issueSeverity: 'low',
      isHovered: true,
      className:
        'bg-[linear-gradient(to_right,--theme(--color-orange-100)_0,--theme(--color-gray-100)_4rem)]',
    },
    {
      issueSeverity: 'high',
      isHovered: true,
      className:
        'bg-[linear-gradient(to_right,--theme(--color-red-100)_0,--theme(--color-gray-100)_4rem)]',
    },
    { issueSeverity: 'none', isPressed: true, className: 'bg-gray-200/80' },
    {
      issueSeverity: 'low',
      isPressed: true,
      className:
        'bg-[linear-gradient(to_right,--theme(--color-orange-200)_0,--theme(--color-gray-200/80%)_4rem)]',
    },
    {
      issueSeverity: 'high',
      isPressed: true,
      className:
        'bg-[linear-gradient(to_right,--theme(--color-red-200)_0,--theme(--color-gray-200/80%)_4rem)]',
    },
  ],
  defaultVariants: {
    issueSeverity: 'none',
  },
});

export type IssueSeverity = 'none' | 'low' | 'high';
