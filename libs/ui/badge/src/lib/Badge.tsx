import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'info' | 'warning' | 'default';
  size?: 'sm' | 'base';
  className?: string;
}

const styles = tv({
  base: 'badge inline-flex items-center font-medium ring-1 ring-inset [&_&]:rounded-md [&_&]:bg-white [&_&]:ring-zinc-600/10 [&_&]:ml-1.5 [&_&]:py-0.5 [&_&]:px-1.5 [&:has(>_.badge)]:py-0.5 [&:has(>_.badge)]:pr-0.5',
  variants: {
    variant: {
      success: 'bg-green-50 text-green-700 ring-green-600/20',
      danger: 'bg-red-50 text-red-700 ring-red-600/10',
      info: 'bg-blue-50 text-blue-700 ring-blue-700/10',
      warning: 'bg-orange-50 text-orange-800 ring-orange-600/20',
      default: 'bg-zinc-50 text-zinc-600 ring-zinc-600/10',
    },
    size: {
      sm: 'px-1.5 py-0.5 text-xs rounded-md',
      base: 'px-2 py-1 text-xs rounded-lg',
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
