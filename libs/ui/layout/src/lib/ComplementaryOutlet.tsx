import { type PropsWithChildren } from 'react';

interface ComplementaryProps {
  id?: string;
}

export function ComplementaryOutlet(
  props: PropsWithChildren<ComplementaryProps>,
) {
  return (
    <>
      <div className="invisible fixed inset-0 z-100 bg-gray-800/30 bg-none from-zinc-800/20 to-transparent to-50% transition-opacity sm:pointer-events-none sm:z-30 sm:bg-transparent sm:bg-linear-to-l 3xl:bg-none [&:has(+aside_[data-complementary-content])]:visible" />
      <aside className="fixed top-[50%] left-[100vw] z-100 flex max-h-[90vh] max-w-screen translate-x-[calc(-50%-50vw)] -translate-y-1/2 flex-col transition sm:top-24 sm:bottom-6 sm:z-50 sm:max-h-none sm:translate-x-[calc(-100%-1.5rem)] sm:translate-y-0 lg:bottom-6 lg:max-h-none lg:translate-x-[calc(-100%-2rem)] 3xl:top-[calc(0.75rem+3.5rem+2.5rem)] 3xl:max-h-[1400px] 3xl:translate-x-[calc(-50vw+min(50rem,calc(50vw-400px-2rem)))] 3xl:pt-10 [&:has([data-complementary-content])]:duration-250 [&:has([data-complementary-content])]:animate-in [&:has([data-complementary-content])]:fade-in [&:has([data-complementary-content])]:slide-in-from-right [&:not(:has([data-complementary-content]))]:hidden">
        <div
          {...props}
          className="relative flex h-full max-h-[inherit] w-[400px] max-w-[90vw] flex-auto flex-col"
        />
      </aside>
    </>
  );
}
