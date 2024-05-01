import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const CircleX = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM16.4485 7.55147C16.9172 8.0201 16.9172 8.7799 16.4485 9.24853L13.6971 12L16.4485 14.7515C16.9172 15.2201 16.9172 15.9799 16.4485 16.4485C15.9799 16.9172 15.2201 16.9172 14.7515 16.4485L12 13.6971L9.24853 16.4485C8.7799 16.9172 8.0201 16.9172 7.55147 16.4485C7.08284 15.9799 7.08284 15.2201 7.55147 14.7515L10.3029 12L7.55147 9.24853C7.08284 8.7799 7.08284 8.0201 7.55147 7.55147C8.0201 7.08284 8.7799 7.08284 9.24853 7.55147L12 10.3029L14.7515 7.55147C15.2201 7.08284 15.9799 7.08284 16.4485 7.55147Z"
        fill="currentColor"
      />
    </svg>
  );
});