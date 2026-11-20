import {
  observeWindowOffset,
  observeWindowRect,
  Virtualizer,
  windowScroll,
  type PartialKeys,
  type VirtualizerOptions,
} from '@tanstack/react-virtual';
import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

type WindowVirtualizerOptions = PartialKeys<
  VirtualizerOptions<Window, Element>,
  | 'getScrollElement'
  | 'observeElementRect'
  | 'observeElementOffset'
  | 'scrollToFn'
>;

export function useQuietWindowVirtualizer(options: WindowVirtualizerOptions) {
  const rerender = useReducer((count: number) => count + 1, 0)[1];
  const renderedRef = useRef<{
    items: unknown;
    isScrolling: boolean;
    range: Virtualizer<Window, Element>['range'];
  } | null>(null);
  const resolvedOptions: VirtualizerOptions<Window, Element> = {
    getScrollElement: () => (typeof document !== 'undefined' ? window : null),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
    initialOffset: () => (typeof document !== 'undefined' ? window.scrollY : 0),
    ...options,
    onChange: (instance, sync) => {
      const rendered = renderedRef.current;
      if (
        rendered &&
        rendered.items === instance.getVirtualItems() &&
        rendered.isScrolling === instance.isScrolling &&
        (instance.isScrolling ||
          (rendered.range?.startIndex === instance.range?.startIndex &&
            rendered.range?.endIndex === instance.range?.endIndex))
      ) {
        return;
      }
      if (sync) {
        flushSync(rerender);
      } else {
        rerender();
      }
    },
  };
  const [instance] = useState(
    () => new Virtualizer<Window, Element>(resolvedOptions),
  );
  instance.setOptions(resolvedOptions);
  const items = instance.getVirtualItems();
  const isScrolling = instance.isScrolling;
  const range = instance.range;
  useLayoutEffect(() => {
    renderedRef.current = { items, isScrolling, range };
  });
  useLayoutEffect(() => instance._didMount(), [instance]);
  useLayoutEffect(() => instance._willUpdate());
  return instance;
}
