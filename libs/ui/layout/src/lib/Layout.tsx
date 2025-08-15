import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { AppBar } from './AppBar';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { ComplementaryOutlet } from './ComplementaryOutlet';
import { NotificationRegion } from '@restate/ui/notification';
import { Toolbar } from './Toolbar';

/* eslint-disable-next-line */
export interface LayoutProps {}

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-3 sm:px-6 sm:py-6 lg:px-8 3xl:max-w-[min(100rem,calc(100vw-800px-4rem))]">
      <AppBar id={ZONE_IDS[LayoutZone.AppBar]} />
      <NotificationRegion />
      <div className="flex flex-auto flex-row 3xl:ml-[calc(-400px-2rem)] 3xl:grid 3xl:w-[calc(100%+800px+4rem)] 3xl:[grid-template-columns:400px_1fr_400px] 3xl:gap-8">
        <main
          id={ZONE_IDS[LayoutZone.Content]}
          className="relative col-start-2 col-end-3 flex max-w-full min-w-0 flex-auto flex-col px-4 pt-8 pb-32"
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
      document.getElementById(ZONE_IDS[zone])!,
    );
  } else {
    return null;
  }
}
