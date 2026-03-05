import { useRef } from 'react';
import type { TimelineEngineOutput } from './TimelineEngineContext';

const DEFAULT_INSPECT_STABILIZE_LAG_THRESHOLD_MS = 500;

export interface TimelineRenderFrame {
  coordinateStart: number;
  coordinateEnd: number;
  viewportStart: number;
  viewportEnd: number;
  viewportDuration: number;
  zoomLevel: number;
  offsetPercent: number;
  overviewStart: number;
  overviewEnd: number;
}

interface TimelineRenderFrameOptions {
  inspectStabilizeLagThresholdMs?: number;
}

function buildRenderFrame(engine: TimelineEngineOutput): TimelineRenderFrame {
  return {
    coordinateStart: engine.coordinateStart,
    coordinateEnd: engine.coordinateEnd,
    viewportStart: engine.viewportStart,
    viewportEnd: engine.viewportEnd,
    viewportDuration: engine.viewportDuration,
    zoomLevel: engine.zoomLevel,
    offsetPercent: engine.offsetPercent,
    overviewStart: engine.overviewStart,
    overviewEnd: engine.overviewEnd,
  };
}

export function useTimelineRenderFrame(
  engine: TimelineEngineOutput,
  options?: TimelineRenderFrameOptions,
): TimelineRenderFrame {
  const frame = buildRenderFrame(engine);
  const stableInspectLiveFrameRef = useRef<TimelineRenderFrame | null>(null);

  const liveEdgeMs = engine.coordinateStart + engine.actualDuration;
  const lagMs = Math.max(0, liveEdgeMs - engine.viewportEnd);
  const thresholdMs =
    options?.inspectStabilizeLagThresholdMs ??
    DEFAULT_INSPECT_STABILIZE_LAG_THRESHOLD_MS;

  const shouldStabilizeInspectLiveFrame =
    engine.mode === 'inspect' && engine.canReturnToLive && lagMs > thresholdMs;

  if (shouldStabilizeInspectLiveFrame) {
    const stable = stableInspectLiveFrameRef.current;
    if (!stable) {
      stableInspectLiveFrameRef.current = frame;
      return frame;
    }

    const hasViewportChanged =
      Math.abs(frame.viewportStart - stable.viewportStart) > 0.5 ||
      Math.abs(frame.viewportEnd - stable.viewportEnd) > 0.5;

    if (hasViewportChanged) {
      stableInspectLiveFrameRef.current = frame;
      return frame;
    }

    return stable;
  }

  stableInspectLiveFrameRef.current = frame;
  return frame;
}
