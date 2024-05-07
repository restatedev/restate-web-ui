import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { AppBar } from './AppBar';
import { ZONE_IDS, LayoutZone } from './LayoutZone';

/* eslint-disable-next-line */
export interface LayoutProps {}

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="flex w-full flex-col min-h-full mx-auto max-w-6xl py-3 sm:py-6 px-3 sm:px-6 lg:px-8">
      <AppBar id={ZONE_IDS[LayoutZone.AppBar]} />
      <main
        id={ZONE_IDS[LayoutZone.Content]}
        className="py-14 px-4 flex-auto flex flex-col"
      />
      {children}
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
  return createPortal(
    <>
      {children}
      <div data-variant={variant} />
    </>,
    document.getElementById(ZONE_IDS[zone])!
  );
}
