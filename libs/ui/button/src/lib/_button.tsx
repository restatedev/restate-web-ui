import type { PropsWithChildren } from 'react';
export interface ButtonProps {
  onClick?: VoidFunction;
  type?: 'button' | 'submit';
  name?: string;
  value?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
