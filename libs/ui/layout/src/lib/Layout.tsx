import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { AppBar } from './AppBar';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { ComplementaryOutlet } from './ComplementaryOutlet';
import { defaultConfig } from 'tailwind-variants';
import { NotificationRegion } from '@restate/ui/notification';

// TODO: refactor to a separate pacakge
defaultConfig.twMergeConfig = {
  classGroups: {
    'font-size': [{ text: ['code', '2xs'] }],
  },
};

/* eslint-disable-next-line */
export interface LayoutProps {}

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="flex w-full flex-col min-h-[100vh] mx-auto max-w-6xl py-3 sm:py-6 px-3 sm:px-6 lg:px-8">
      <AppBar id={ZONE_IDS[LayoutZone.AppBar]} />
      <NotificationRegion />
      <div className="flex-auto flex flex-row 3xl:w-[calc(100%+700px+4rem)] 3xl:ml-[calc(-350px-2rem)] 3xl:grid 3xl:[grid-template-columns:350px_1fr_350px] 3xl:gap-8">
        <main
          id={ZONE_IDS[LayoutZone.Content]}
          className="pb-[8rem] pt-[2rem] px-4 flex-auto flex flex-col relative col-start-2 col-end-3"
        ></main>
        <ComplementaryOutlet id={ZONE_IDS[LayoutZone.Complementary]} />
      </div>

      {children}
      <div className="hidden [&:has(>*>*)]:block z-0 h-20 fixed left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-gray-100">
        <div
          id={ZONE_IDS[LayoutZone.Toolbar]}
          className="absolute top-0 left-[50vw] -translate-x-1/2"
        />
      </div>
    </div>
  );
}

export function LayoutOutlet({
  zone,
  children,
  variant = 'primary',
}: PropsWithChildren<{
  zone: LayoutZone;
  variant?: 'primary' | 'secondary' | 'hidden';
}>) {
  if (typeof document !== 'undefined') {
    return createPortal(
      <>
        {children}
        <div data-variant={variant} />
      </>,
      document.getElementById(ZONE_IDS[zone])!
    );
  } else {
    return null;
  }
}
