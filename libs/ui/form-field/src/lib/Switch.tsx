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
  base: 'flex h-5 w-9 shrink-0 items-center rounded-full border border-black/5 px-0.5 shadow-[inset_0_1px_1.5px_0px_rgba(0,0,0,0.1)] transition-colors duration-200',
  variants: {
    isSelected: {
      false: 'bg-gray-200 group-pressed:bg-gray-300',
      true: 'bg-blue-600 group-pressed:bg-blue-700',
    },
    isDisabled: {
      true: 'border-transparent bg-gray-100 shadow-none',
    },
  },
});

const thumbStyles = tv({
  base: 'h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
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
