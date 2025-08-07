import { tv } from 'tailwind-variants';

export const focusRing = tv({
  base: 'outline outline-offset-2 outline-blue-600',
  variants: {
    isFocusVisible: {
      false: 'outline-0',
      true: 'outline-2',
    },
  },
});
