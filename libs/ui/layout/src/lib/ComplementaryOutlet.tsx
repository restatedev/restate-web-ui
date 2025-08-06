import { type PropsWithChildren } from 'react';
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
        className={`${styles.overlay} sm:pointer-events-none bg-none 3xl:[background-image:none] sm:bg-linear-to-l from-zinc-800/20 to-transparent to-50% fixed z-100 sm:z-30 inset-0 bg-gray-800 sm:bg-transparent bg-opacity-30 transition-opacity`}
      />
      <aside className="transition translate-x-[calc(-50%-50vw)] left-[100vw] sm:translate-x-[calc(-100%-1.5rem)] lg:translate-x-[calc(-100%-2rem)] 3xl:translate-x-[calc(-50vw+min(50rem,calc(50vw-400px-2rem)))] [&:has(>*>*)]:duration-250 [&:has(>*>*)]:animate-in [&:has(>*>*)]:slide-in-from-right [&:has(>*>*)]:fade-in [&:not(has(>*>*))]:duration-250 flex flex-col top-[50%] -translate-y-1/2 sm:translate-y-0  sm:top-24 3xl:top-[calc(0.75rem+3.5rem+2.5rem)] 3xl:pt-10 [&:not(:has([data-complementary-content]>*))]:hidden fixed z-100 sm:z-50 lg:bottom-6 sm:bottom-6 max-h-[90vh] max-w-screen sm:max-h-none lg:max-h-none 3xl:h2-fit 3xl:max-h-[1400px] ">
        <div
          {...props}
          className="relative *:row-start-1 *:row-end-2 *:col-start-1 *:col-end-2 *:data-[top=false]:absolute [&>[data-top=false]:has(~[data-top=false]>*:nth-child(2)>*:nth-child(2))]:-right-3 [&>[data-top=false]:has(~[data-top=false])]:top-3 [&>[data-top=false]:has(~[data-top=false])]:bottom-3 [&>*[data-top=false]]:-right-1.5 *:data-[top=false]:top-1.5 *:data-[top=false]:bottom-1.5 h-full flex-auto max-h-[inherit] grid grid-cols-[1fr] grid-rows-[1fr] max-w-[90vw] w-[400px]"
        />
      </aside>
    </>
  );
}
