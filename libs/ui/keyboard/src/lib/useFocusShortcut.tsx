import { useEffect, useRef, type RefObject } from 'react';

interface UseFocusShortcutOptions {
  onFocus?: () => void;
}

export function useFocusShortcut<T extends HTMLElement = HTMLInputElement>(
  options?: UseFocusShortcutOptions,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const onFocus = options?.onFocus;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.repeat) {
        return;
      }

      // Don't trigger when typing in form elements or inside certain UI components
      if (
        event.target instanceof HTMLElement &&
        (/^(?:input|textarea|select|button)$/i.test(event.target.tagName) ||
          event.target.closest('[role=listbox]') ||
          event.target.closest('[role=dialog]') ||
          event.target.closest('[class~="monaco-editor"]'))
      ) {
        return;
      }

      event.preventDefault();

      if (onFocus) {
        onFocus();
      } else {
        ref.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onFocus]);

  return ref;
}
