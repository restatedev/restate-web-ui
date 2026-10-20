import { focusRing } from '@restate/ui-focus';
import { tv } from '@restate/util-styles';
import { Group as AriaGroup } from 'react-aria-components';
import { ComponentProps } from 'react';

interface FormFieldGroupProps extends Pick<
  ComponentProps<typeof AriaGroup>,
  'children'
> {
  className?: string;
}

export const fieldBorderStyles = tv({
  variants: {
    isFocusWithin: {
      false: 'border-strong',
      true: 'rounded-[0.625rem] border-neutral-strong outline-offset-8 outline-transparent',
    },
    isInvalid: {
      true: 'border-danger-strong forced-colors:border-[Mark]',
    },
    isDisabled: {
      true: 'border-default forced-colors:border-[GrayText]',
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
