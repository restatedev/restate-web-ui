import { forwardRef, type PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import {
  PressEvent,
  Button as RACButton,
  composeRenderProps,
} from 'react-aria-components';
import { focusRing } from '@restate/ui/focus';
import { PressEvents } from '@react-aria/interactions';

export interface ButtonProps {
  onClick?: (
    event: Omit<PressEvent, 'target'> & { target: HTMLButtonElement }
  ) => void;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
  className?: string;
  form?: string;
  slot?: string;
  onHover?: VoidFunction;
}

const styles = tv({
  extend: focusRing,
  base: 'px-5 py-2 text-sm text-center transition rounded-xl border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none cursor-default',
  variants: {
    variant: {
      primary:
        'bg-gradient-to-b from-blue-600/90 to-blue-600 disabled:bg-gray-400 disabled:shadow-none disabled:drop-shadow-none disabled:text-gray-200 hover:from-blue-700 hover:to-blue-700 pressed:from-blue-800 pressed:to-blue-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] drop-shadow-sm hover:shadow-none pressed:shadow-none',
      secondary: 'bg-white hover:bg-gray-100 pressed:bg-gray-200 text-gray-800',
      destructive:
        'bg-gradient-to-b from-red-700/95 to-red-700  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] drop-shadow-sm hover:from-red-800 hover:to-red-800 pressed:from-red-900 pressed:to-red-900 text-white hover:shadow-none pressed:shadow-none',
      icon: 'shadow-none border-0 p-1 flex items-center justify-center text-gray-600 hover:bg-black/[5%] pressed:bg-black/10 disabled:bg-transparent',
    },
    isDisabled: {
      true: 'bg-none bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 forced-colors:text-[GrayText] border-black/5 dark:border-white/5',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export const Button = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<ButtonProps>
>(({ variant, onClick, disabled, onHover, ...props }, ref) => {
  return (
    <RACButton
      {...props}
      onHoverStart={onHover}
      ref={ref}
      isDisabled={disabled}
      onPress={onClick as PressEvents['onPress']}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, variant, className })
      )}
    />
  );
});
