import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { useHydrated } from '@restate/util/remix';
import { ZONE_IDS, LayoutZone } from './LayoutZone';

// `createPortal` renders nothing during SSR, so this is necessarily client-only.
// Gate on `useHydrated` (not `typeof document`, which is undefined on the server
// but defined during hydration and would portal against a null server render):
// render null until hydrated, then mount the portal.
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
  const hydrated = useHydrated();
  if (!hydrated) {
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
