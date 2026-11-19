import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { usePreventScroll } from 'react-aria';

type Mode = 'closed' | 'hover' | 'pinned';

const pinnedPopover: { close?: () => void } = {};

export function useHoverPinPopover(onOpenChange?: (isOpen: boolean) => void) {
  const [mode, setModeState] = useState<Mode>('closed');
  const modeRef = useRef<Mode>('closed');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modeAtPressStartRef = useRef<Mode>('closed');
  const onOpenChangeRef = useRef(onOpenChange);
  const isOpen = mode !== 'closed';

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  usePreventScroll({ isDisabled: mode !== 'pinned' });

  const closeSelf = useCallback(() => {
    modeRef.current = 'closed';
    setModeState('closed');
  }, []);

  const setMode = useCallback(
    (nextMode: Mode) => {
      if (nextMode === 'pinned' && pinnedPopover.close !== closeSelf) {
        pinnedPopover.close?.();
        pinnedPopover.close = closeSelf;
      } else if (nextMode !== 'pinned' && pinnedPopover.close === closeSelf) {
        pinnedPopover.close = undefined;
      }
      modeRef.current = nextMode;
      setModeState(nextMode);
    },
    [closeSelf],
  );

  useEffect(
    () => () => {
      if (pinnedPopover.close === closeSelf) {
        pinnedPopover.close = undefined;
      }
    },
    [closeSelf],
  );

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
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const triggerId = triggerRef.current?.id;
      if (
        triggerId &&
        target instanceof Element &&
        target.closest('[data-trigger]')?.getAttribute('aria-labelledby') ===
          triggerId &&
        !target.closest('[role="dialog"]')
      ) {
        setMode('closed');
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [isOpen, setMode]);

  const handlePressStart = useCallback(
    (event: SyntheticEvent) => {
      if (
        !(event.target instanceof Node) ||
        !triggerRef.current?.contains(event.target)
      ) {
        return;
      }
      modeAtPressStartRef.current = modeRef.current;
      if (
        event.type === 'pointerdown' &&
        'button' in event &&
        event.button === 0 &&
        modeRef.current === 'hover'
      ) {
        setMode('pinned');
      }
    },
    [setMode],
  );

  const handleOpenChange = useCallback(
    (nextIsOpen: boolean) => {
      if (modeRef.current === 'pinned') {
        return;
      }
      setMode(nextIsOpen ? 'hover' : 'closed');
      if (nextIsOpen) {
        onOpenChangeRef.current?.(true);
      }
    },
    [setMode],
  );

  const handlePress = useCallback(() => {
    const nextMode =
      modeAtPressStartRef.current === 'pinned' ? 'closed' : 'pinned';
    setMode(nextMode);
    if (nextMode === 'pinned') {
      onOpenChangeRef.current?.(true);
    }
  }, [setMode]);

  return {
    isOpen,
    isPinned: mode === 'pinned',
    triggerRef,
    onOpenChange: handleOpenChange,
    onPress: handlePress,
    onPressStart: handlePressStart,
  };
}
