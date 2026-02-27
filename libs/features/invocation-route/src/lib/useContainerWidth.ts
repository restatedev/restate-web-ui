import { RefObject, useEffect, useRef, useState } from 'react';

export function useContainerWidth(): [
  ref: RefObject<HTMLDivElement | null>,
  width: number,
] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
