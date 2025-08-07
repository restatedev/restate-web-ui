import { createTV } from 'tailwind-variants';

export const tv = createTV({
  twMergeConfig: {
    classGroups: {
      'font-size': [{ text: ['code', '2xs', '3xs'] }],
    },
  },
});
