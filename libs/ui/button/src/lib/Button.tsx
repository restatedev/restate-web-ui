import { ComponentProps, forwardRef, type PropsWithChildren } from 'react';
import { tv } from '@restate/util-styles';
import {
  PressEvent,
  Button as RACButton,
  composeRenderProps,
} from 'react-aria-components';
import { focusRing } from '@restate/ui-focus';
import { PressEvents } from 'react-aria';

export interface ButtonProps {
  onClick?: (
    event: Omit<PressEvent, 'target'> & { target: HTMLButtonElement },
  ) => void;
  onKeyDown?: ComponentProps<typeof RACButton>['onKeyDown'];
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
  className?: string;
  form?: string;
  slot?: string;
}

const styles = tv({
  extend: focusRing,
  base: 'cursor-default rounded-xl border border-tint px-5 py-2 text-center text-sm shadow-xs',
  variants: {
    variant: {
      primary:
        'bg-linear-to-b from-accent/90 to-accent text-inverse shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/20%)] drop-shadow-xs hover:from-accent-hover hover:to-accent-hover hover:shadow-none disabled:shadow-none disabled:drop-shadow-none pressed:from-accent-pressed pressed:to-accent-pressed pressed:shadow-none',
      secondary:
        'bg-raised text-primary hover:wash-tint pressed:wash-tint-strong',
      destructive:
        'bg-linear-to-b from-danger/95 to-danger text-inverse shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/15%)] drop-shadow-xs hover:from-danger-hover hover:to-danger-hover hover:shadow-none pressed:from-danger-pressed pressed:to-danger-pressed pressed:shadow-none',
      icon: 'flex items-center justify-center border-0 p-1 text-tertiary shadow-none hover:bg-tint disabled:bg-transparent pressed:bg-tint-strong',
    },
    isDisabled: {
      true: 'border-tint-subtle bg-muted bg-none text-subtle',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export const Button = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<ButtonProps>
>(({ variant, onClick, disabled, ...props }, ref) => {
  return (
    <RACButton
      {...props}
      ref={ref}
      isDisabled={disabled}
      onPress={onClick as PressEvents['onPress']}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, variant, className }),
      )}
    />
  );
});
