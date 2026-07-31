import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const LimitKey = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-limit-key-icon
      {...props}
    >
      <circle cx="4.5" cy="6.5" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="17.5" r="1" />
      <path d="M9 4.5v5" />
      <path d="M9 14.5v5" />
      <path d="M7.5 12h12" />
      <path d="m16.5 9 3 3-3 3" />
    </svg>
  );
});
