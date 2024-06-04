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
}

const styles = tv({
  extend: focusRing,
  base: 'px-5 py-2 text-sm text-center transition rounded-xl border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none cursor-default',
  variants: {
    variant: {
      primary:
        'bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white shadow-sm',
      secondary:
        'bg-white hover:bg-gray-100 pressed:bg-gray-200 text-gray-800 dark:bg-zinc-600 dark:hover:bg-zinc-500 dark:pressed:bg-zinc-400 dark:text-zinc-100',
      destructive: 'bg-red-700 hover:bg-red-800 pressed:bg-red-900 text-white',
      icon: 'shadow-none border-0 p-1 flex items-center justify-center text-gray-600 hover:bg-black/[5%] pressed:bg-black/10 disabled:bg-transparent',
    },
    isDisabled: {
      true: 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 forced-colors:text-[GrayText] border-black/5 dark:border-white/5',
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
        styles({ ...renderProps, variant, className })
      )}
    />
  );
});
