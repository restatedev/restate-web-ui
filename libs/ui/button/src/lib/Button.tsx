import type { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { Button as RACButton, composeRenderProps } from 'react-aria-components';
import { focusRing } from '@restate/ui/focus';

export interface ButtonProps {
  onClick?: VoidFunction;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
  className?: string;
}

const styles = tv({
  extend: focusRing,
  base: 'px-5 py-2 text-sm text-center transition rounded-xl border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:shadow-none cursor-default',
  variants: {
    variant: {
      primary: 'bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white',
      secondary:
        'bg-gray-100 hover:bg-gray-200 pressed:bg-gray-300 text-gray-800 dark:bg-zinc-600 dark:hover:bg-zinc-500 dark:pressed:bg-zinc-400 dark:text-zinc-100',
      destructive: 'bg-red-700 hover:bg-red-800 pressed:bg-red-900 text-white',
      icon: 'border-0 p-1 flex items-center justify-center text-gray-600 hover:bg-black/[5%] pressed:bg-black/10 dark:text-zinc-400 dark:hover:bg-white/10 dark:pressed:bg-white/20 disabled:bg-transparent',
    },
    isDisabled: {
      true: 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText] border-black/5 dark:border-white/5',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export function Button({
  variant,
  onClick,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <RACButton
      {...props}
      isDisabled={disabled}
      onPress={onClick}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, variant, className })
      )}
    />
  );
}
