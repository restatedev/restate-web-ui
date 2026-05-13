import { type PropsWithChildren } from 'react';

interface SidebarComplementaryOutletProps {
  id?: string;
}

export function SidebarComplementaryOutlet(
  props: PropsWithChildren<SidebarComplementaryOutletProps>,
) {
  return (
    <>
      <div className="invisible fixed inset-0 z-100 bg-gray-800/30 bg-none from-zinc-800/20 to-transparent to-50% transition-opacity sm:pointer-events-none sm:z-30 sm:bg-transparent sm:bg-linear-to-l 3xl:hidden [&:has(+aside_[data-complementary-content]>*)]:visible" />
      <aside className="3xl2:has-[[data-complementary-content]>*]:bg-gray-200/50 3xl2:has-[[data-complementary-content]>*]:backdrop-blur-xl 3xl2:has-[[data-complementary-content]>*]:backdrop-saturate-200 fixed top-[50%] left-[100vw] z-100 flex max-h-[90vh] max-w-screen translate-x-[calc(-50%-50vw)] -translate-y-1/2 flex-col transition sm:top-3 sm:bottom-3 sm:z-50 sm:max-h-[calc(100vh-1.5rem)] sm:translate-x-[calc(-100%-0.75rem)] sm:translate-y-0 lg:top-3 lg:bottom-3 lg:max-h-[calc(100vh-1.5rem)] lg:translate-x-[calc(-100%-0.75rem)] 3xl:sticky 3xl:top-0 3xl:left-auto 3xl:z-30 3xl:h-screen 3xl:max-h-screen 3xl:w-0 3xl:flex-none 3xl:translate-x-0 3xl:translate-y-0 3xl:overflow-x-hidden 3xl:overflow-y-auto 3xl:bg-gray-200/50 3xl:p-0 3xl:transition-[width,padding,background-color,border-color,box-shadow] 3xl:duration-300 3xl:has-[[data-complementary-content]>*]:w-[28rem] 3xl:has-[[data-complementary-content]>*]:border-l 3xl:has-[[data-complementary-content]>*]:p-3 3xl:has-[[data-complementary-content]>*]:shadow-[inset_1px_0px_0px_0px_rgba(0,0,0,0.03)] 3xl:[&_[data-complementary-content]]:max-h-none 3xl:[&_[data-complementary-content]]:min-h-0 3xl:[&_[data-complementary-content]]:overflow-visible 3xl:[&_[data-top]]:max-h-none 3xl:[&_[data-top]]:overflow-visible [&:has(>*>*)]:duration-250 [&:has(>*>*)]:animate-in [&:has(>*>*)]:fade-in [&:has(>*>*)]:slide-in-from-right 3xl:[&:has(>*>*)]:slide-in-from-right-0 [&:not(:has([data-complementary-content]>*))]:hidden 3xl:[&:not(:has([data-complementary-content]>*))]:flex [&:not(:has(>*>*))]:duration-250">
        <div
          {...props}
          className="relative grid h-full max-h-[inherit] w-[400px] max-w-[90vw] flex-auto grid-cols-[1fr] grid-rows-[1fr] *:col-start-1 *:col-end-2 *:row-start-1 *:row-end-2 3xl:h-auto 3xl:max-h-none 3xl:w-full [&>[data-top=false]:has(~[data-top=false])]:top-3 [&>[data-top=false]:has(~[data-top=false])]:bottom-3 [&>[data-top=false]:has(~[data-top=false]>*:nth-child(2)>*:nth-child(2))]:-right-3 [&>[data-top=false]:not(:only-child)]:absolute [&>[data-top=false]:not(:only-child)]:top-1.5 [&>[data-top=false]:not(:only-child)]:-right-1.5 [&>[data-top=false]:not(:only-child)]:bottom-1.5 3xl:[&>[data-top=false]:not(:only-child)]:-right-0"
        />
      </aside>
    </>
  );
}
