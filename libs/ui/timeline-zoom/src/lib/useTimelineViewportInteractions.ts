import type { RefObject } from 'react';
import { useCallback } from 'react';
import type { TimelineEngineOutput } from './TimelineEngineContext';
import { useTimelineRenderFrame } from './renderFrame';
import { useTimelineWheelPan } from './useTimelineWheelPan';
import { useTimelineZoomControls } from './useTimelineZoomControls';

export function useTimelineViewportInteractions({
  engine,
  containerRef,
  zoomInFactor = 2,
  inspectStabilizeLagThresholdMs,
}: {
  engine: TimelineEngineOutput;
  containerRef: RefObject<HTMLElement | null>;
  zoomInFactor?: number;
  inspectStabilizeLagThresholdMs?: number;
}) {
  const frame = useTimelineRenderFrame(engine, {
    inspectStabilizeLagThresholdMs,
  });

  useTimelineWheelPan({
    containerRef,
    viewportDurationMs: frame.viewportDuration,
    panByMs: engine.panViewport,
  });

  const { zoomIn, resetZoom } = useTimelineZoomControls({
    frame,
    setViewport: engine.setViewport,
  });

  const zoomInStep = useCallback(() => {
    zoomIn(zoomInFactor);
  }, [zoomIn, zoomInFactor]);

  return {
    frame,
    zoomIn: zoomInStep,
    resetZoom,
  };
}
