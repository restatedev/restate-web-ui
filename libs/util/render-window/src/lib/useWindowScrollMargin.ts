import { type RefCallback, type RefObject, useCallback, useState } from 'react';

export function useWindowScrollMargin<T extends HTMLElement>(
  elementRef: RefObject<T | null>,
): [ref: RefCallback<T>, scrollMargin: number] {
  const [scrollMargin, setScrollMargin] = useState(0);

  const ref = useCallback(
    (node: T | null) => {
      elementRef.current = node;
      if (!node) return;

      const update = () =>
        setScrollMargin(
          Math.round(node.getBoundingClientRect().top + window.scrollY),
        );
      const observer = new ResizeObserver(update);
      for (
        let ancestor = node.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        observer.observe(ancestor);
      }
      update();

      return () => {
        observer.disconnect();
        elementRef.current = null;
      };
    },
    [elementRef],
  );

  return [ref, scrollMargin];
}
