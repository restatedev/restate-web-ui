import { type RefCallback, useCallback, useState } from 'react';

export function useContainerWidth(): [
  ref: RefCallback<HTMLDivElement>,
  width: number,
] {
  const [width, setWidth] = useState(0);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
