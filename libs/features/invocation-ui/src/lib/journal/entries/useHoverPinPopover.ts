import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';

type Mode = 'closed' | 'hover' | 'pinned';

export function useHoverPinPopover(onOpenChange?: (isOpen: boolean) => void) {
  const [mode, setMode] = useState<Mode>('closed');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modeAtPressStartRef = useRef<Mode>('closed');
  const onOpenChangeRef = useRef(onOpenChange);
  const isOpen = mode !== 'closed';

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !triggerRef.current?.contains(target) &&
        !target.closest('[data-trigger]')
      ) {
        setMode('closed');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMode('closed');
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isOpen]);

  const handlePressStart = useCallback(
    (event: SyntheticEvent) => {
      if (
        event.target instanceof Node &&
        triggerRef.current?.contains(event.target)
      ) {
        modeAtPressStartRef.current = mode;
      }
    },
    [mode],
  );

  const handleOpenChange = useCallback((nextIsOpen: boolean) => {
    setMode(nextIsOpen ? 'hover' : 'closed');
    if (nextIsOpen) {
      onOpenChangeRef.current?.(true);
    }
  }, []);

  const handlePress = useCallback(() => {
    const nextMode =
      modeAtPressStartRef.current === 'pinned' ? 'closed' : 'pinned';
    setMode(nextMode);
    if (nextMode === 'pinned') {
      onOpenChangeRef.current?.(true);
    }
  }, []);

  return {
    isOpen,
    isPinned: mode === 'pinned',
    triggerRef,
    onOpenChange: handleOpenChange,
    onPress: handlePress,
    onPressStart: handlePressStart,
  };
}
