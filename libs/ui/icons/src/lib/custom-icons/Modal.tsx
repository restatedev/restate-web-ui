import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const Modal = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M2.5 16.5 7 8.5h5l-4.5 8z" />
        <path d="M12 8.5h5l4.5 8h-5z" />
        <path d="M7.5 16.5h9" />
      </g>
    </svg>
  );
});
