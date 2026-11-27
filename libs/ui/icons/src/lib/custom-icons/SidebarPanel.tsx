import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const SidebarPanel = forwardRef<SVGSVGElement, LucideProps>(
  (props, ref) => {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        ref={ref}
        {...props}
      >
        <rect
          x="2.5"
          y="3.75"
          width="15"
          height="12.5"
          rx="2.75"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <rect
          x="4.75"
          y="6"
          width="3.5"
          height="8"
          rx="1.25"
          fill="currentColor"
        />
      </svg>
    );
  },
);
