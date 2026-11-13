import { useCallback, useRef, useState } from 'react';

export function useContainerWidth(): [
  ref: (node: HTMLDivElement | null) => void,
  width: number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(node);
    observerRef.current = observer;
    setWidth(Math.round(node.getBoundingClientRect().width));
  }, []);

  return [ref, width];
}
