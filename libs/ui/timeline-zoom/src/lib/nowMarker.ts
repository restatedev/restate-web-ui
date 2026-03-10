import type { TimelineMode } from './TimelineEngineContext';

const DEFAULT_NOW_PIN_EDGE_THRESHOLD_MS = 500;
const DEFAULT_NOW_PIN_PROXIMITY_THRESHOLD_MS = 80;

export interface ResolveTimelineNowMarkerStateInput {
  mode: TimelineMode;
  coordinateStartMs: number;
  viewportStartMs: number;
  viewportEndMs: number;
  nowMs: number;
  pinEdgeThresholdMs?: number;
  pinProximityThresholdMs?: number;
}

export interface TimelineNowMarkerState {
  pinToRightEdge: boolean;
  renderInTimeline: boolean;
}

export function resolveTimelineNowMarkerState({
  mode,
  coordinateStartMs,
  viewportStartMs,
  viewportEndMs,
  nowMs,
  pinEdgeThresholdMs = DEFAULT_NOW_PIN_EDGE_THRESHOLD_MS,
  pinProximityThresholdMs = DEFAULT_NOW_PIN_PROXIMITY_THRESHOLD_MS,
}: ResolveTimelineNowMarkerStateInput): TimelineNowMarkerState {
  const isViewportAnchoredToStart =
    Math.abs(viewportStartMs - coordinateStartMs) < 1;
  const hasFutureHeadroomInViewport =
    viewportEndMs - nowMs > pinEdgeThresholdMs;
  const isNowNearViewportEnd =
    Math.abs(viewportEndMs - nowMs) <= pinProximityThresholdMs;

  const pinToRightEdge =
    mode === 'live-follow' &&
    !isViewportAnchoredToStart &&
    !hasFutureHeadroomInViewport &&
    isNowNearViewportEnd;

  return {
    pinToRightEdge,
    renderInTimeline: !pinToRightEdge,
  };
}
