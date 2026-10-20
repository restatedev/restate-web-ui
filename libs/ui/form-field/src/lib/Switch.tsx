import { ReactNode } from 'react';
import {
  Switch as AriaSwitch,
  SwitchProps as AriaSwitchProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';
import { focusRing } from '@restate/ui-focus';

const styles = tv({
  base: 'group inline-flex cursor-default items-center gap-2 text-sm transition',
  variants: {
    isDisabled: {
      true: 'cursor-not-allowed text-faint',
      false: 'text-primary',
    },
  },
  defaultVariants: {
    isDisabled: false,
  },
});

const trackStyles = tv({
  extend: focusRing,
  base: 'flex h-5 w-9 shrink-0 items-center rounded-full border border-tint-subtle px-0.5 shadow-[inset_0_1px_1.5px_0px_--theme(--box-shadow-color-default/10%)] transition-colors duration-200',
  variants: {
    isSelected: {
      false: 'bg-emphasis group-pressed:bg-strong',
      true: 'bg-accent group-pressed:bg-accent-hover',
    },
    isDisabled: {
      true: 'border-transparent bg-muted shadow-none',
    },
  },
});

const thumbStyles = tv({
  base: 'h-4 w-4 rounded-full bg-surface shadow-sm transition-transform duration-200',
  variants: {
    isSelected: {
      false: 'translate-x-0',
      true: 'translate-x-4',
    },
    isDisabled: {
      true: 'bg-strong shadow-none',
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
