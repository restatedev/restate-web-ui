import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import { Group as AriaGroup } from 'react-aria-components';
import { PropsWithChildren } from 'react';

interface FormFieldGroupProps {
  className?: string;
}

const fieldBorderStyles = tv({
  variants: {
    isFocusWithin: {
      false: 'border-gray-300 dark:border-zinc-500',
      true: 'border-gray-600 dark:border-zinc-300 rounded-[0.625rem] outline-offset-8',
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
  base: 'group flex items-start flex-col',
  variants: fieldBorderStyles.variants,
});

export function FormFieldGroup({
  className,
  ...props
}: PropsWithChildren<FormFieldGroupProps>) {
  return (
    <AriaGroup
      {...props}
      className={(renderProps) =>
        fieldGroupStyles({ ...renderProps, className })
      }
    />
  );
}
