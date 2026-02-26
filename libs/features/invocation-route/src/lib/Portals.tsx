import {
  createContext,
  PropsWithChildren,
  use,
  useCallback,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const PortalContext = createContext<{
  getPortal?: (id: string) => HTMLElement | null | undefined;
  setPortal?: (id: string, element: HTMLElement | null) => void;
}>({});

export function PortalProvider({ children }: PropsWithChildren) {
  const [portals, setPortals] = useState<
    Record<string, HTMLElement | undefined | null>
  >({});

  const getPortal = useCallback(
    (id: string) => {
      return portals[id];
    },
    [portals],
  );

  const setPortal = useCallback((id: string, element: HTMLElement | null) => {
    return setPortals((p) => {
      if (p[id] === element) {
        return p;
      }
      return { ...p, [id]: element };
    });
  }, []);

  return (
    <PortalContext.Provider value={{ getPortal, setPortal }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortals(id: string) {
  const { getPortal: contextGetPortal, setPortal: contextSetPortal } =
    use(PortalContext);

  const getPortal = useCallback(() => {
    return contextGetPortal?.(id);
  }, [contextGetPortal, id]);

  const setPortal = useCallback(
    (element: HTMLElement | null) => {
      return contextSetPortal?.(id, element);
    },
    [contextSetPortal, id],
  );

  return { getPortal, setPortal };
}

const VIEWPORT_SELECTOR_PORTAL_ID = 'viewport-selector-portal';

export function ViewportSelectorPortalTarget({
  className,
}: {
  className?: string;
}) {
  const { setPortal } = usePortals(VIEWPORT_SELECTOR_PORTAL_ID);
  return <div ref={setPortal} className={className} />;
}

export function ViewportSelectorPortalContent({ children }: PropsWithChildren) {
  const { getPortal } = usePortals(VIEWPORT_SELECTOR_PORTAL_ID);
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

const UNITS_PORTAL_ID = 'units-portal';

export function UnitsPortalTarget({ className }: { className?: string }) {
  const { setPortal } = usePortals(UNITS_PORTAL_ID);
  return <div ref={setPortal} className={className} />;
}

export function UnitsPortalContent({ children }: PropsWithChildren) {
  const { getPortal } = usePortals(UNITS_PORTAL_ID);
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

const ZOOM_CONTROLS_PORTAL_ID = 'zoom-controls-portal';

export function ZoomControlsPortalTarget({
  className,
}: {
  className?: string;
}) {
  const { setPortal } = usePortals(ZOOM_CONTROLS_PORTAL_ID);
  return <div ref={setPortal} className={className} />;
}

export function ZoomControlsPortalContent({ children }: PropsWithChildren) {
  const { getPortal } = usePortals(ZOOM_CONTROLS_PORTAL_ID);
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}
