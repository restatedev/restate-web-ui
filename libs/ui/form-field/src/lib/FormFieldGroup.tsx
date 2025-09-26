import { focusRing } from '@restate/ui/focus';
import { tv } from '@restate/util/styles';
import { Group as AriaGroup } from 'react-aria-components';
import { ComponentProps } from 'react';

interface FormFieldGroupProps
  extends Pick<ComponentProps<typeof AriaGroup>, 'children'> {
  className?: string;
}

export const fieldBorderStyles = tv({
  variants: {
    isFocusWithin: {
      false: 'border-gray-300 dark:border-zinc-500',
      true: 'rounded-[0.625rem] border-gray-600 outline-offset-8 outline-transparent dark:border-zinc-300',
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
  base: 'group flex flex-col items-start',
  variants: fieldBorderStyles.variants,
});

export function FormFieldGroup({ className, ...props }: FormFieldGroupProps) {
  return (
    <AriaGroup
      {...props}
      className={(renderProps) =>
        fieldGroupStyles({ ...renderProps, className })
      }
    />
  );
}
