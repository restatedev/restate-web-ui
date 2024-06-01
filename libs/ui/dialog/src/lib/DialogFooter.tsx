import {
  PropsWithChildren,
  createContext,
  useContext,
  useId,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const DialogFooterContext = createContext<{ container: HTMLElement | null }>({
  container: null,
});

export function DialogFooterContainer({ children }: PropsWithChildren<object>) {
  const id = useId();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <DialogFooterContext.Provider value={{ container }}>
      {children}
      <div id={id} ref={setContainer} className="py-1 pb-0 mt-1" />
    </DialogFooterContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DialogFooterProps {}
export function DialogFooter({
  children,
}: PropsWithChildren<DialogFooterProps>) {
  const { container } = useContext(DialogFooterContext);

  if (container) {
    return createPortal(children, container);
  }
  return null;
}
