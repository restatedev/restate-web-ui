import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

export function useTimelineWheelPan({
  containerRef,
  viewportDurationMs,
  panByMs,
}: {
  containerRef: RefObject<HTMLElement | null>;
  viewportDurationMs: number;
  panByMs: (deltaMs: number) => void;
}) {
  const viewportDurationRef = useRef(viewportDurationMs);
  viewportDurationRef.current = viewportDurationMs;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      const viewportDuration = viewportDurationRef.current;
      e.preventDefault();

      let deltaX = e.deltaX;
      if (e.deltaMode === 1) deltaX *= 16;

      const timeDelta = (deltaX / container.clientWidth) * viewportDuration;
      panByMs(timeDelta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, panByMs]);
}
