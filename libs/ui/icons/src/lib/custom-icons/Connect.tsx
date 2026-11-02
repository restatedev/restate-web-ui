import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const Connect = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
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
      <path d="M14.02 11.86a1.44 1.44 0 0 0-.72-1.246l-5.04-2.88a1.44 1.44 0 0 0-1.44 0l-5.04 2.88A1.44 1.44 0 0 0 1.06 11.86v5.76a1.44 1.44 0 0 0 .72 1.246l5.04 2.88a1.44 1.44 0 0 0 1.44 0l5.04-2.88a1.44 1.44 0 0 0 .72-1.246Z" />
      <path d="M1.276 11.14l6.264 3.6 6.264-3.6" />
      <path d="M7.54 21.94v-7.2" />
      <path d="M14.5 5.5a5 5 0 0 1 4 4" />
      <path d="M14.5 1.5a9 9 0 0 1 8 8" />
    </svg>
  );
});
