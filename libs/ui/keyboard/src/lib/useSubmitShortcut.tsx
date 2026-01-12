import { useEffect, useRef, type RefObject } from 'react';

export function useSubmitShortcut<
  T extends HTMLElement = HTMLButtonElement,
>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        // Don't interfere if focus is inside a listbox or dialog
        if (
          event.target instanceof HTMLElement &&
          (event.target.closest('[role=listbox]') ||
            event.target.closest('[role=dialog]'))
        ) {
          return;
        }

        const element = ref.current;
        if (element && !element.hasAttribute('disabled')) {
          event.preventDefault();
          element.click();
        }
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () =>
      document.removeEventListener('keydown', handler, { capture: true });
  }, []);
  return ref;
}
