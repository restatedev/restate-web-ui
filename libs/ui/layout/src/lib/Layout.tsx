import { ElementType, PropsWithChildren, createElement } from 'react';
import { createPortal } from 'react-dom';

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
  [LayoutZone.AppBar]: 'header',
  [LayoutZone.Nav]: 'nav',
  [LayoutZone.Content]: 'main',
};

const ZONE_PROPS: Record<LayoutZone, { id: string; className?: string }> = {
  [LayoutZone.AppBar]: { id: ZONE_IDS[LayoutZone.AppBar] },
  [LayoutZone.Nav]: { id: ZONE_IDS[LayoutZone.Nav] },
  [LayoutZone.Content]: { id: ZONE_IDS[LayoutZone.Content] },
};

const ALL_ZONES = Object.keys(ZONE_IDS) as LayoutZone[];

export function LayoutProvider({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div>
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
}: PropsWithChildren<{ zone: LayoutZone }>) {
  return createPortal(children, document.getElementById(ZONE_IDS[zone])!);
}
