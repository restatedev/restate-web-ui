import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const Lambda = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...props}
    >
      <path
        d="M5.97229 7.10384V3H11.6933L18.4463 16.9205H20.2423V21H15.6102L8.86529 7.10384H5.97229Z"
        fill="currentColor"
      />
      <path
        d="M10.4586 15.2551L8.0452 10.2834L3 20.9654H7.83833L10.4586 15.2551Z"
        fill="currentColor"
      />
    </svg>
  );
});
