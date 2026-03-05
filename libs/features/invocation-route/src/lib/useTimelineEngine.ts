import {
  applyTickCountGuardrail as applyTimelineTickCountGuardrail,
  FOLLOW_LATEST_THRESHOLD,
  selectCoordinateWindow as selectTimelineCoordinateWindow,
  selectTickInterval as selectTimelineTickInterval,
  TimelineZoomMode,
  useTimelineZoom,
} from '@restate/ui/timeline-zoom';

export type TimelineMode = 'live-follow' | 'inspect' | 'static';

export interface TimelineEngineOutput {
  mode: TimelineMode;
  coordinateStart: number;
  coordinateEnd: number;
  actualDuration: number;
  viewportStart: number;
  viewportEnd: number;
  viewportDuration: number;
  zoomLevel: number;
  offsetPercent: number;
  tickInterval: number;
  isFullTrace: boolean;
  canReturnToLive: boolean;
  overviewStart: number;
  overviewEnd: number;
  setViewport: (start: number, end: number) => void;
  resetViewport: () => void;
  panViewport: (deltaMs: number) => void;
  returnToLive: () => void;
}

export const TAIL_FOLLOW_THRESHOLD = FOLLOW_LATEST_THRESHOLD;

function toTimelineZoomMode(mode: TimelineMode): TimelineZoomMode {
  if (mode === 'live-follow') {
    return 'follow-latest';
  }
  return mode;
}

function fromTimelineZoomMode(mode: TimelineZoomMode): TimelineMode {
  if (mode === 'follow-latest') {
    return 'live-follow';
  }
  return mode;
}

export function selectCoordinateWindow(
  actualDuration: number,
  currentCoordinateWindow: number,
): number {
  return selectTimelineCoordinateWindow(actualDuration, currentCoordinateWindow);
}

export function selectTickInterval(
  viewportDuration: number,
  widthPx: number,
  currentInterval: number,
  lastChangeTime: number,
  mode: TimelineMode,
  now: number,
  bypassCooldown: boolean,
): number {
  return selectTimelineTickInterval(
    viewportDuration,
    widthPx,
    currentInterval,
    lastChangeTime,
    toTimelineZoomMode(mode),
    now,
    bypassCooldown,
  );
}

export function applyTickCountGuardrail(
  viewportDuration: number,
  interval: number,
  mode: TimelineMode,
): number {
  return applyTimelineTickCountGuardrail(
    viewportDuration,
    interval,
    toTimelineZoomMode(mode),
  );
}

export function useTimelineEngine({
  actualStart,
  actualEnd,
  areAllCompleted,
  isLiveEnabled,
  containerWidthPx,
}: {
  actualStart: number;
  actualEnd: number;
  areAllCompleted: boolean;
  isLiveEnabled: boolean;
  containerWidthPx: number;
}): TimelineEngineOutput {
  const zoom = useTimelineZoom({
    rangeStart: actualStart,
    rangeEnd: actualEnd,
    isComplete: areAllCompleted,
    isStreaming: isLiveEnabled,
    containerWidthPx,
  });

  return {
    mode: fromTimelineZoomMode(zoom.mode),
    coordinateStart: zoom.coordinateStart,
    coordinateEnd: zoom.coordinateEnd,
    actualDuration: zoom.rangeDuration,
    viewportStart: zoom.viewportStart,
    viewportEnd: zoom.viewportEnd,
    viewportDuration: zoom.viewportDuration,
    zoomLevel: zoom.zoomLevel,
    offsetPercent: zoom.offsetPercent,
    tickInterval: zoom.tickInterval,
    isFullTrace: zoom.isFullRange,
    canReturnToLive: zoom.canFollowLatest,
    overviewStart: zoom.overviewStart,
    overviewEnd: zoom.overviewEnd,
    setViewport: zoom.setViewport,
    resetViewport: zoom.resetViewport,
    panViewport: zoom.panViewport,
    returnToLive: zoom.followLatest,
  };
}
