import { useCallback, useMemo } from 'react';
import type { TimelineRenderFrame } from './renderFrame';

export function useTimelineZoomControls({
  frame,
  setViewport,
  zoomAnchor = 'center',
}: {
  frame: TimelineRenderFrame;
  setViewport: (start: number, end: number) => void;
  zoomAnchor?: 'right' | 'center';
}) {
  const coordinateDuration = Math.max(
    1,
    frame.coordinateEnd - frame.coordinateStart,
  );
  const viewportDuration = Math.max(1, frame.viewportEnd - frame.viewportStart);

  const zoomToDuration = useCallback(
    (targetDuration: number) => {
      const boundedDuration = Math.max(
        1,
        Math.min(targetDuration, coordinateDuration),
      );
      const maxStart = frame.coordinateEnd - boundedDuration;
      const anchorMs =
        zoomAnchor === 'right'
          ? frame.viewportEnd
          : (frame.viewportStart + frame.viewportEnd) / 2;
      const anchoredStart =
        zoomAnchor === 'right'
          ? anchorMs - boundedDuration
          : anchorMs - boundedDuration / 2;
      const newStart = Math.max(
        frame.coordinateStart,
        Math.min(maxStart, anchoredStart),
      );
      setViewport(newStart, newStart + boundedDuration);
    },
    [
      coordinateDuration,
      frame.coordinateEnd,
      frame.coordinateStart,
      frame.viewportEnd,
      frame.viewportStart,
      setViewport,
      zoomAnchor,
    ],
  );

  const zoomIn = useCallback(
    (factor = 2) => {
      zoomToDuration(viewportDuration / factor);
    },
    [viewportDuration, zoomToDuration],
  );

  const resetZoom = useCallback(() => {
    setViewport(frame.coordinateStart, frame.coordinateEnd);
  }, [frame.coordinateEnd, frame.coordinateStart, setViewport]);

  return useMemo(
    () => ({
      coordinateDuration,
      viewportDuration,
      zoomToDuration,
      zoomIn,
      resetZoom,
    }),
    [coordinateDuration, viewportDuration, zoomToDuration, zoomIn, resetZoom],
  );
}
