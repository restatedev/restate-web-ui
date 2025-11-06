import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useId,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const PortalContext = createContext<{
  elements: Record<string, HTMLElement | null>;
  setElements: Dispatch<SetStateAction<Record<string, HTMLElement | null>>>;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
}>({ elements: {}, setElements: () => {} });

export function PortalProvider({ children }: PropsWithChildren) {
  const [elements, setElements] = useState<Record<string, HTMLElement | null>>(
    {},
  );
  return (
    <PortalContext.Provider value={{ elements, setElements }}>
      {children}
    </PortalContext.Provider>
  );
}

function useSetPortal(id: string, elementId: string) {
  const { setElements } = useContext(PortalContext);

  const setElement = useCallback(
    (element: HTMLElement | null) => {
      setElements((prevElements) => {
        return {
          ...prevElements,
          ...((!prevElements[id] ||
            element ||
            elementId === prevElements[id].id) && {
            [id]: element,
          }),
        };
      });
    },
    [setElements, id, elementId],
  );

  return { setElement };
}

export function Portal({ className, id }: { className?: string; id: string }) {
  const elementId = useId();
  const { setElement } = useSetPortal(id, elementId);

  return <div ref={setElement} className={className} id={elementId} />;
}

export function InPortal({ children, id }: PropsWithChildren<{ id: string }>) {
  const { elements } = useContext(PortalContext);
  const element = elements[id];

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}
