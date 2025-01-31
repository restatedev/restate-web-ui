import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { AppBar } from './AppBar';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { ComplementaryOutlet } from './ComplementaryOutlet';
import { defaultConfig } from 'tailwind-variants';
import { NotificationRegion } from '@restate/ui/notification';
import { Toolbar } from './Toolbar';

// TODO: refactor to a separate pacakge
defaultConfig.twMergeConfig = {
  classGroups: {
    'font-size': [{ text: ['code', '2xs', '3xs'] }],
  },
};

/* eslint-disable-next-line */
export interface LayoutProps {}

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="flex w-full flex-col min-h-[100vh] mx-auto max-w-6xl 3xl:max-w-[min(100rem,calc(100vw-800px-4rem))] py-3 sm:py-6 px-3 sm:px-6 lg:px-8">
      <AppBar id={ZONE_IDS[LayoutZone.AppBar]} />
      <NotificationRegion />
      <div className="flex-auto flex flex-row 3xl:w-[calc(100%+800px+4rem)] 3xl:ml-[calc(-400px-2rem)] 3xl:grid 3xl:[grid-template-columns:400px_1fr_400px] 3xl:gap-8">
        <main
          id={ZONE_IDS[LayoutZone.Content]}
          className="min-w-0 max-w-full pb-[8rem] pt-[2rem] px-4 flex-auto flex flex-col relative col-start-2 col-end-3"
        ></main>
        <ComplementaryOutlet id={ZONE_IDS[LayoutZone.Complementary]} />
      </div>

      {children}

      <Toolbar id={ZONE_IDS[LayoutZone.Toolbar]} />
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
        {zone === LayoutZone.AppBar && <div data-variant={variant} />}
      </>,
      document.getElementById(ZONE_IDS[zone])!
    );
  } else {
    return null;
  }
}
