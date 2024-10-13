import { tv } from 'tailwind-variants';

export const focusRing = tv({
  base: 'outline outline-blue-600 outline-offset-2',
  variants: {
    isFocusVisible: {
      false: 'outline-0',
      true: 'outline-2',
    },
  },
});
