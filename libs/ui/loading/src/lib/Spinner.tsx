import type { ComponentProps } from 'react';
import { tv } from '@restate/util/styles';

const spinnerStyles = tv({
  base: 'h-5 w-5 animate-spin',
});

export const Spinner = ({
  className,
  style,
}: {
  className?: string;
  style?: ComponentProps<'svg'>['style'];
}) => (
  <svg
    className={spinnerStyles({ className })}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    style={style}
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
