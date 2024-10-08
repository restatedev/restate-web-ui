import type { PropsWithChildren } from 'react';

interface ComplementaryProps {
  id?: string;
}

export function ComplementaryOutlet(
  props: PropsWithChildren<ComplementaryProps>
) {
  return (
    <>
      <div className="sm:pointer-events-none [background-image:none] 3xl:[background-image:none] sm:bg-gradient-to-tl from-zinc-800/20 to-transparent to-50% [&:not(:has(+aside_[data-complementary-content]>*))]:hidden sm2:hidden fixed z-50 sm:z-30 inset-0 bg-gray-800 sm:bg-transparent bg-opacity-30 bg2-gradient-to-bl from2-gray-800/10 to2-gray-800/80 transition-opacity" />
      <aside className="h-fit min-h-[50vh] 3xl:sticky top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:translate-x-0 sm:top-auto 3xl:top-[calc(0.75rem+3.5rem+2.5rem)] 3xl:px-0 3xl:pt-14 [&:not(:has([data-complementary-content]>*))]:hidden fixed z-50 lg:right-8 sm:right-6 right-auto sm:left-auto lg:bottom-8 sm:bottom-6 bottom-3 max-w-[100vw] 3xl:max-h-auto max-h-[calc(100vh-4rem-4rem)] sm:max-h-[calc(100vh-1.5rem-1.5rem-1.5rem-3.5rem)] lg:max-h-[calc(100vh-2rem-2rem-1.5rem-3.5rem)] 3xl:max-h-none">
        <div
          {...props}
          className="p-1.5 border shadow-lg shadow-zinc-800/5 bg-gray-50/80 backdrop-blur-xl backdrop-saturate-200 rounded-[1.125rem] h-fit max-h-[inherit] flex flex-col max-w-[90vw] w-[350px]"
        />
      </aside>
    </>
  );
}
