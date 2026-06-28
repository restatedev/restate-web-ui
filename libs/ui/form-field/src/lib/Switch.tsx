import { ReactNode } from 'react';
import {
  Switch as AriaSwitch,
  SwitchProps as AriaSwitchProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';

const styles = tv({
  base: 'group inline-flex cursor-default items-center gap-2 text-sm transition',
  variants: {
    isDisabled: {
      true: 'cursor-not-allowed text-gray-300',
      false: 'text-gray-800',
    },
  },
  defaultVariants: {
    isDisabled: false,
  },
});

const trackStyles = tv({
  extend: focusRing,
  base: 'flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors duration-200',
  variants: {
    isSelected: {
      false: 'bg-gray-200 group-pressed:bg-gray-300',
      true: 'bg-blue-500 group-pressed:bg-blue-600',
    },
    isDisabled: {
      true: 'bg-gray-100',
    },
  },
});

const thumbStyles = tv({
  base: 'h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200',
  variants: {
    isSelected: {
      false: 'translate-x-0',
      true: 'translate-x-4',
    },
    isDisabled: {
      true: 'bg-gray-300 shadow-none',
    },
  },
});

interface SwitchProps extends Omit<
  AriaSwitchProps,
  'children' | 'className' | 'style'
> {
  children?: ReactNode;
  className?: string;
}

export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({ isDisabled: renderProps.isDisabled, className }),
      )}
    >
      {({ isSelected, isDisabled, isFocusVisible }) => (
        <>
          <div
            className={trackStyles({ isSelected, isDisabled, isFocusVisible })}
          >
            <div className={thumbStyles({ isSelected, isDisabled })} />
          </div>
          {children}
        </>
      )}
    </AriaSwitch>
  );
}
