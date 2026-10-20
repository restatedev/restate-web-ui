import { PropsWithChildren, ComponentPropsWithoutRef } from 'react';
import { tv } from '@restate/util-styles';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'info' | 'warning' | 'default';
  size?: 'sm' | 'base' | 'xs';
  className?: string;
}

const styles = tv({
  base: 'badge inline-flex items-center border font-medium [&_&]:ml-1.5 [&_&]:rounded-md [&_&]:border-tint-subtle [&_&]:bg-surface [&_&]:px-1.5 [&_&]:py-0.5 [&:has(>_.badge)]:py-0.5 [&:has(>_.badge)]:pr-0.5 [&:has(>_.badge)]:pl-2',
  variants: {
    variant: {
      success: 'border-success-strong/20 bg-success-subtle text-success-strong',
      danger: 'border-danger-strong/10 bg-danger-subtle text-danger-strong',
      info: 'border-info-strong/10 bg-info-subtle text-info-strong',
      warning: 'border-warning-strong/20 bg-warning-subtle text-warning-strong',
      default: 'border-tint-subtle bg-subtle text-tertiary',
    },
    size: {
      xs: 'rounded-full px-1.5 py-0 text-2xs leading-4 font-normal [&_&]:-my-px [&_&]:-mr-px [&_&]:rounded-full [&_&]:py-0 [&:has(>_.badge)]:py-0 [&:has(>_.badge)]:pr-0',
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
  ...props
}: PropsWithChildren<BadgeProps & ComponentPropsWithoutRef<'div'>>) {
  return (
    <div {...props} className={styles({ className, variant, size })}>
      {children}
    </div>
  );
}
