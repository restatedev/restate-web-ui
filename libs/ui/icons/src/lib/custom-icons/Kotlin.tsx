import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const Kotlin = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...props}
    >
      <path
        d="M2.19167 23L12.55 12.4583L23 23H2.19167ZM1 1H12L1 12.4583V1ZM13.2833 1L1 13.8333V23L23 1H13.2833Z"
        fill="currentColor"
      />
    </svg>
  );
});
