import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import { Group as AriaGroup } from 'react-aria-components';
import { PropsWithChildren } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FormFieldGroupProps {}

const fieldBorderStyles = tv({
  variants: {
    isFocusWithin: {
      false:
        'border-gray-300 dark:border-zinc-500 forced-colors:border-[ButtonBorder]',
      true: 'border-gray-600 dark:border-zinc-300 forced-colors:border-[Highlight]',
    },
    isInvalid: {
      true: 'border-red-600 dark:border-red-600 forced-colors:border-[Mark]',
    },
    isDisabled: {
      true: 'border-gray-200 dark:border-zinc-700 forced-colors:border-[GrayText]',
    },
  },
});

const fieldGroupStyles = tv({
  extend: focusRing,
  base: 'group flex items-center h-9 bg-white dark:bg-zinc-900 forced-colors:bg-[Field] border-2 rounded-lg overflow-hidden',
  variants: fieldBorderStyles.variants,
});

export function FormFieldGroup(props: PropsWithChildren<FormFieldGroupProps>) {
  return (
    <AriaGroup
      {...props}
      className={(renderProps) => fieldGroupStyles({ ...renderProps })}
    />
  );
}
