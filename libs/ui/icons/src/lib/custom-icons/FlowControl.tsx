import { type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const FlowControl = forwardRef<SVGSVGElement, LucideProps>(
  (props, ref) => {
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
        {...props}
      >
        <path d="M3 3.5c5 2.25 10 3.75 18 3.75" />
        <path d="M3 12h18" />
        <path d="M3 20.5c5-2.25 10-3.75 18-3.75" />
        <circle cx="10" cy="6" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="8" cy="18.5" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    );
  },
);
