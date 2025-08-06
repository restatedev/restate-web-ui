import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'info' | 'warning' | 'default';
  size?: 'sm' | 'base';
  className?: string;
}

const styles = tv({
  base: 'badge inline-flex items-center font-medium border in-[&]:rounded-md in-[&]:bg-white in-[&]:border-zinc-600/10 in-[&]:ml-1.5 in-[&]:py-0.5 in-[&]:px-1.5 [&:has(>_.badge)]:py-0.5 [&:has(>_.badge)]:pr-0.5',
  variants: {
    variant: {
      success: 'bg-green-50 text-green-700 border-green-600/20',
      danger: 'bg-red-50 text-red-700 border-red-600/10',
      info: 'bg-blue-50 text-blue-700 border-blue-700/10',
      warning: 'bg-orange-50 text-orange-800 border-orange-600/20',
      default: 'bg-zinc-50 text-zinc-600 border-zinc-600/10',
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
