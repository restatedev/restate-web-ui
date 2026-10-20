import { tv } from '@restate/util-styles';

export const focusRing = tv({
  base: 'outline-offset-2 outline-focus',
  variants: {
    isFocusVisible: {
      false: 'outline-none',
      true: 'outline-2',
    },
  },
});
