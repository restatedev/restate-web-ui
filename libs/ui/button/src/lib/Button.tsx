import { ComponentProps, forwardRef, type PropsWithChildren } from 'react';
import { tv } from '@restate/util/styles';
import {
  PressEvent,
  Button as RACButton,
  composeRenderProps,
} from 'react-aria-components';
import { focusRing } from '@restate/ui/focus';
import { PressEvents } from '@react-aria/interactions';

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
  base: 'cursor-default rounded-xl border border-black/10 px-5 py-2 text-center text-sm shadow-xs',
  variants: {
    variant: {
      primary:
        'bg-linear-to-b from-blue-600/90 to-blue-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] drop-shadow-xs hover:from-blue-700 hover:to-blue-700 hover:shadow-none disabled:shadow-none disabled:drop-shadow-none pressed:from-blue-800 pressed:to-blue-800 pressed:shadow-none',
      secondary: 'bg-white text-gray-800 hover:bg-gray-100 pressed:bg-gray-200',
      destructive:
        'bg-linear-to-b from-red-700/95 to-red-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] drop-shadow-xs hover:from-red-800 hover:to-red-800 hover:shadow-none pressed:from-red-900 pressed:to-red-900 pressed:shadow-none',
      icon: 'flex items-center justify-center border-0 p-1 text-gray-600 shadow-none hover:bg-black/5 disabled:bg-transparent pressed:bg-black/10',
    },
    isDisabled: {
      true: 'border-black/5 bg-gray-100 bg-none text-gray-400',
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
