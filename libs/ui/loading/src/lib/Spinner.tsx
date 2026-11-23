import type { ComponentProps } from 'react';
import { tv } from '@restate/util-styles';

const spinnerStyles = tv({
  base: 'shrink-0 animate-spin',
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  style?: ComponentProps<'svg'>['style'];
}

export const Spinner = ({ size, label, className, style }: SpinnerProps) => (
  <svg
    className={spinnerStyles({ size, className })}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    style={style}
    {...(label
      ? { role: 'status', 'aria-label': label }
      : { 'aria-hidden': true })}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className=""
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.21.895 4.21 2.344 5.657l2.217-2.123z"
    ></path>
  </svg>
);
