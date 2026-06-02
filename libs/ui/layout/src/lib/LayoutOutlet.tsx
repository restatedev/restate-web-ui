import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { ZONE_IDS, LayoutZone } from './LayoutZone';

export function LayoutOutlet({
  zone,
  slot,
  children,
  variant = 'primary',
}: PropsWithChildren<{
  zone: LayoutZone;
  slot?: string;
  variant?: 'primary' | 'secondary' | 'hidden';
}>) {
  if (typeof document === 'undefined') {
    return null;
  }
  const id = slot ? `${ZONE_IDS[zone]}-${slot}` : ZONE_IDS[zone];
  const target = document.getElementById(id);
  if (!target) {
    return null;
  }
  return createPortal(
    <>
      {children}
      {zone === LayoutZone.AppBar && <div data-variant={variant} />}
      {zone === LayoutZone.SideBar && variant !== 'primary' && (
        <div data-variant={variant} hidden />
      )}
    </>,
    target,
  );
}
