import { JournalEntryV2 } from '@restate/data-access/admin-api';
import {
  createContext,
  PropsWithChildren,
  use,
  useCallback,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export function getTimelineId(
  invocationId: string,
  index?: number,
  type?: string,
  category?: string,
) {
  return `${invocationId}-journal-timeline-${category}-${type}-${index}`;
}

export function getActionId(
  invocationId: string,
  index?: number,
  type?: string,
  category?: string,
) {
  return `${invocationId}-journal-entry-action-${category}-${type}-${index}`;
}

export function getEntryId(
  invocationId: string,
  index?: number,
  type?: string,
  category?: string,
) {
  return `${invocationId}-journal-entry-${category}-${type}-${index}`;
}

export function TimelinePortal({
  children,
  invocationId,
  entry,
}: PropsWithChildren<{
  invocationId: string;
  entry?: JournalEntryV2;
}>) {
  const { getPortal } = usePortals(
    getTimelineId(invocationId, entry?.index, entry?.type, entry?.category),
  );
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

export function ActionPortal({
  children,
  invocationId,
  entry,
}: PropsWithChildren<{
  invocationId: string;
  entry?: JournalEntryV2;
}>) {
  const { getPortal } = usePortals(
    getActionId(invocationId, entry?.index, entry?.type, entry?.category),
  );
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

export function EntryPortal({
  children,
  index,
  invocationId,
  type,
  category,
}: PropsWithChildren<{
  invocationId: string;
  index?: number;
  type?: string;
  category?: string;
}>) {
  const { getPortal } = usePortals(
    getEntryId(invocationId, index, type, category),
  );
  const element = getPortal?.();

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

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
    return setPortals((p) => ({ ...p, [id]: element }));
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
