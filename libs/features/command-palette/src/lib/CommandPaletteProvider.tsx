import {
  createContext,
  lazy,
  type PropsWithChildren,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

const CommandPaletteDialog = lazy(() => import('./CommandPaletteDialog'));

interface CommandPaletteContextValue {
  open: VoidFunction;
  shortcut: string;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => undefined,
  shortcut: '⌘K',
});

function isMac() {
  return /mac(os|intosh)|iphone|ipad/i.test(navigator.userAgent);
}

function subscribeToPlatform() {
  return () => undefined;
}

function getShortcut() {
  return isMac() ? '⌘K' : 'Ctrl K';
}

function getServerShortcut() {
  return '⌘K';
}

export function CommandPaletteProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const shortcut = useSyncExternalStore(
    subscribeToPlatform,
    getShortcut,
    getServerShortcut,
  );

  const open = useCallback(() => {
    setHasOpened(true);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'k' ||
        !(isMac() ? event.metaKey : event.ctrlKey) ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('.monaco-editor')
      ) {
        return;
      }
      event.preventDefault();
      setHasOpened(true);
      setIsOpen((current) => !current);
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () =>
      document.removeEventListener('keydown', handler, { capture: true });
  }, []);

  const value = useMemo(() => ({ open, shortcut }), [open, shortcut]);

  return (
    <CommandPaletteContext value={value}>
      {children}
      {hasOpened && (
        <Suspense fallback={null}>
          <CommandPaletteDialog isOpen={isOpen} onOpenChange={setIsOpen} />
        </Suspense>
      )}
    </CommandPaletteContext>
  );
}

export function useCommandPalette() {
  return use(CommandPaletteContext);
}
