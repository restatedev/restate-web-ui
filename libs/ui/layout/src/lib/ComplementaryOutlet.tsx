import type { PropsWithChildren } from 'react';
import styles from './Complementary.module.css';

interface ComplementaryProps {
  id?: string;
}

export function ComplementaryOutlet(
  props: PropsWithChildren<ComplementaryProps>
) {
  return (
    <>
      <div
        className={`${styles.overlay} sm:pointer-events-none [background-image:none] 3xl:[background-image:none] sm:bg-gradient-to-l from-zinc-800/20 to-transparent to-50% fixed z-[100] sm:z-30 inset-0 bg-gray-800 sm:bg-transparent bg-opacity-30 transition-opacity`}
      />
      <aside className="[&:has(>*>*)]:duration-250 [&:has(>*>*)]:animate-in [&:has(>*>*)]:slide-in-from-right [&:has(>*>*)]:fade-in [&:not(has(>*>*))]:duration-250 flex flex-col 3xl:sticky top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:translate-x-0 sm:top-24 3xl:top-[calc(0.75rem+3.5rem+2.5rem)] 3xl:px-0 3xl:pt-8 [&:not(:has([data-complementary-content]>*))]:hidden fixed z-[100] sm:z-50 lg:right-8 sm:right-6 right-auto sm:left-auto lg:bottom-6 sm:bottom-6 max-h-[90vh] max-w-[100vw] 3xl:max-h-auto sm:max-h-none lg:max-h-none 3xl:max-h-none">
        <div
          {...props}
          className="relative [&>*]:row-start-1 [&>*]:row-end-2 [&>*]:col-start-1 [&>*]:col-end-2 [&>[data-top=false]]:absolute [&>[data-top=false]:has(~[data-top=false])]:-right-3 [&>[data-top=false]:has(~[data-top=false])]:top-3 [&>[data-top=false]:has(~[data-top=false])]:bottom-3 [&>*[data-top=false]]:-right-1.5 [&>[data-top=false]]:top-1.5 [&>[data-top=false]]:bottom-1.5 3xl:h-auto h-full flex-auto 3xl:flex-none  max-h-[inherit] grid [grid-template-columns:1fr] [grid-template-rows:1fr] max-w-[90vw] w-[350px]"
        />
      </aside>
    </>
  );
}
