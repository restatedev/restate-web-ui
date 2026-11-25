import { PropsWithChildren, ComponentPropsWithoutRef } from 'react';
import { tv, type Intent } from '@restate/util-styles';

export type BadgeIntent = Exclude<Intent, 'pending'>;

export interface BadgeProps {
  intent?: BadgeIntent;
  /** @deprecated Use `intent`; `default` is `neutral`. */
  variant?: Exclude<BadgeIntent, 'neutral'> | 'default';
  size?: 'xs' | 'sm' | 'md';
  mono?: boolean;
  borderless?: boolean;
  className?: string;
}

const styles = tv({
  base: 'badge inline-flex items-center border font-medium [&_&]:ml-1.5 [&_&]:rounded-md [&_&]:border-tint-subtle [&_&]:bg-surface [&_&]:px-1.5 [&_&]:py-0.5 [&:has(>_.badge)]:py-0.5 [&:has(>_.badge)]:pr-0.5 [&:has(>_.badge)]:pl-2',
  variants: {
    intent: {
      success: 'border-success-strong/20 bg-success-subtle text-success-strong',
      danger: 'border-danger-strong/10 bg-danger-subtle text-danger-strong',
      info: 'border-info-strong/10 bg-info-subtle text-info-strong',
      warning: 'border-warning-strong/20 bg-warning-subtle text-warning-strong',
      neutral: 'border-tint-subtle bg-subtle text-tertiary',
    },
    size: {
      xs: 'rounded-full px-1.5 py-0 text-2xs leading-4 font-normal [&_&]:-my-px [&_&]:-mr-px [&_&]:rounded-full [&_&]:py-0 [&:has(>_.badge)]:py-0 [&:has(>_.badge)]:pr-0',
      sm: 'rounded-md px-1.5 py-0.5 text-xs',
      md: 'rounded-lg px-2 py-1 text-xs',
    },
    mono: {
      true: 'font-mono',
    },
    borderless: {
      true: 'border-0',
    },
  },
  defaultVariants: {
    intent: 'neutral',
    size: 'md',
  },
});

export function Badge({
  children,
  intent,
  variant,
  className,
  size,
  mono,
  borderless,
  ...props
}: PropsWithChildren<BadgeProps & ComponentPropsWithoutRef<'div'>>) {
  return (
    <div
      {...props}
      className={styles({
        className,
        intent: intent ?? (variant === 'default' ? 'neutral' : variant),
        size,
        mono,
        borderless,
      })}
    >
      {children}
    </div>
  );
}
