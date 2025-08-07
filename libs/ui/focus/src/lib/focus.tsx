import { tv } from '@restate/util/styles';

export const focusRing = tv({
  base: 'outline-2 outline-offset-2 outline-blue-600',
  variants: {
    isFocusVisible: {
      false: 'outline-0',
      true: 'outline-2',
    },
  },
});
