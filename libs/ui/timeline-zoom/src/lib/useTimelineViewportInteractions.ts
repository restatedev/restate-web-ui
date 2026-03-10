import type { RefObject } from 'react';
import { useCallback } from 'react';
import type { TimelineEngineOutput } from './TimelineEngineContext';
import { resolveTimelineNowMarkerState } from './nowMarker';
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
  const nowMarker = resolveTimelineNowMarkerState({
    mode: engine.mode,
    coordinateStartMs: frame.coordinateStart,
    viewportStartMs: frame.viewportStart,
    viewportEndMs: frame.viewportEnd,
    nowMs: engine.nowMs,
  });

  useTimelineWheelPan({
    containerRef,
    viewportDurationMs: frame.viewportDuration,
    panByMs: engine.panViewport,
  });

  const { zoomIn, resetZoom } = useTimelineZoomControls({
    frame,
    setViewport: engine.setViewport,
    zoomAnchor: nowMarker.pinToRightEdge ? 'right' : 'center',
  });

  const zoomInStep = useCallback(() => {
    zoomIn(zoomInFactor);
  }, [zoomIn, zoomInFactor]);

  return {
    frame,
    nowMarker,
    zoomIn: zoomInStep,
    resetZoom,
  };
}
