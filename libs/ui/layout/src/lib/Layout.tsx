import { ElementType, PropsWithChildren, createElement } from 'react';
import { createPortal } from 'react-dom';
import { AppBar } from './AppBar';

/* eslint-disable-next-line */
export interface LayoutProps {}

export const enum LayoutZone {
  AppBar = 'AppBar',
  Nav = 'Nav',
  Content = 'Content',
}

const ZONE_IDS: Record<LayoutZone, string> = {
  [LayoutZone.AppBar]: 'layout-app-bar',
  [LayoutZone.Nav]: 'layout-nav',
  [LayoutZone.Content]: 'layout-content',
};

const ZONE_ELEMENT: Record<LayoutZone, ElementType> = {
  [LayoutZone.AppBar]: AppBar,
  [LayoutZone.Nav]: 'nav',
  [LayoutZone.Content]: 'main',
};

const ZONE_PROPS: Record<LayoutZone, { id: string; className?: string }> = {
  [LayoutZone.AppBar]: {
    id: ZONE_IDS[LayoutZone.AppBar],
  },
  [LayoutZone.Nav]: { id: ZONE_IDS[LayoutZone.Nav] },
  [LayoutZone.Content]: {
    id: ZONE_IDS[LayoutZone.Content],
    className: 'py-14 flex-auto flex flex-col',
  },
};

const ALL_ZONES = Object.keys(ZONE_IDS) as LayoutZone[];

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="flex w-full flex-col min-h-full mx-auto max-w-7xl py-3 sm:py-6 px-3 sm:px-6 lg:px-8">
      {ALL_ZONES.map((zone) =>
        createElement(ZONE_ELEMENT[zone], { ...ZONE_PROPS[zone], key: zone })
      )}
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
