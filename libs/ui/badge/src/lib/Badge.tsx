import { PropsWithChildren } from 'react';
import { tv } from '@restate/util/styles';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'info' | 'warning' | 'default';
  size?: 'sm' | 'base' | 'xs';
  className?: string;
}

const styles = tv({
  base: 'badge inline-flex items-center border font-medium [&_&]:ml-1.5 [&_&]:rounded-md [&_&]:border-zinc-600/10 [&_&]:bg-white [&_&]:px-1.5 [&_&]:py-0.5 [&:has(>_.badge)]:py-0.5 [&:has(>_.badge)]:pr-0.5',
  variants: {
    variant: {
      success: 'border-green-600/20 bg-green-50 text-green-700',
      danger: 'border-red-600/10 bg-red-50 text-red-700',
      info: 'border-blue-700/10 bg-blue-50 text-blue-700',
      warning: 'border-orange-600/20 bg-orange-50 text-orange-800',
      default: 'border-zinc-600/10 bg-zinc-50 text-zinc-600',
    },
    size: {
      xs: 'rounded-full px-1.5 py-[0.05rem] text-2xs leading-3 font-normal',
      sm: 'rounded-md px-1.5 py-0.5 text-xs',
      base: 'rounded-lg px-2 py-1 text-xs',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
  },
});

export function Badge({
  children,
  variant,
  className,
  size,
}: PropsWithChildren<BadgeProps>) {
  return <div className={styles({ className, variant, size })}>{children}</div>;
}
