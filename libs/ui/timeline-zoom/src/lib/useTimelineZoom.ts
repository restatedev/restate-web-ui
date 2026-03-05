import { useCallback, useMemo, useRef, useState } from 'react';

export type TimelineZoomMode = 'follow-latest' | 'inspect' | 'static';

export interface TimelineZoomOutput {
  mode: TimelineZoomMode;
  coordinateStart: number;
  coordinateEnd: number;
  rangeDuration: number;
  viewportStart: number;
  viewportEnd: number;
  viewportDuration: number;
  zoomLevel: number;
  offsetPercent: number;
  tickInterval: number;
  isFullRange: boolean;
  canFollowLatest: boolean;
  overviewStart: number;
  overviewEnd: number;
  setViewport: (start: number, end: number) => void;
  resetViewport: () => void;
  panViewport: (deltaMs: number) => void;
  followLatest: () => void;
}

const FLOOR_COORDINATE_WINDOW = 10_000;
const COORDINATE_WINDOW_STEPS = [
  10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000, 28_800_000, 43_200_000, 86_400_000,
];
const OVERSHOOT_FACTOR = 1.15;
const DAY_MS = 86_400_000;
const MIN_VIEWPORT_DURATION = 1;
const FLOOR_VIEWPORT_RIGHT = 3_000;
const FOLLOW_LATEST_STEPS = [
  15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000,
];
export const FOLLOW_LATEST_THRESHOLD = FOLLOW_LATEST_STEPS[0]!;
const NICE_INTERVALS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000,
  30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
  7_200_000, 14_400_000, 28_800_000, 43_200_000,
];
const TARGET_MAJOR_SPACING_PX = 100;
const HYSTERESIS_LOW_PX = 70;
const HYSTERESIS_HIGH_PX = 140;
const CHANGE_COOLDOWN_MS = 800;
const MIN_TICK_COUNT = 3;
const MAX_TICK_COUNT = 10;
const STICKY_SNAP_FRACTION = 0.05;
const STICKY_SNAP_MIN_PX = 8;

export function selectCoordinateWindow(
  rangeDuration: number,
  currentCoordinateWindow: number,
): number {
  const desired = Math.max(
    rangeDuration * OVERSHOOT_FACTOR,
    FLOOR_COORDINATE_WINDOW,
  );

  for (const step of COORDINATE_WINDOW_STEPS) {
    if (step >= desired) return Math.max(currentCoordinateWindow, step);
  }

  const coordinateWindow = Math.ceil(desired / DAY_MS) * DAY_MS;
  return Math.max(currentCoordinateWindow, coordinateWindow);
}

function computeFollowLatestViewportWindow(rangeDuration: number): number {
  const target = rangeDuration * 0.5;
  let tailWindow = FOLLOW_LATEST_STEPS[0]!;
  for (const step of FOLLOW_LATEST_STEPS) {
    if (step <= target) {
      tailWindow = step;
    } else {
      break;
    }
  }
  return Math.max(tailWindow, 15_000);
}

function findBestInterval(viewportDuration: number, widthPx: number): number {
  if (widthPx <= 0 || viewportDuration <= 0) return NICE_INTERVALS[0]!;

  let best = NICE_INTERVALS[0]!;
  let bestDiff = Infinity;
  for (const interval of NICE_INTERVALS) {
    const spacing = (interval / viewportDuration) * widthPx;
    const diff = Math.abs(spacing - TARGET_MAJOR_SPACING_PX);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = interval;
    }
  }
  return best;
}

export function selectTickInterval(
  viewportDuration: number,
  widthPx: number,
  currentInterval: number,
  lastChangeTime: number,
  mode: TimelineZoomMode,
  now: number,
  bypassCooldown: boolean,
): number {
  if (widthPx <= 0 || viewportDuration <= 0) {
    return currentInterval > 0 ? currentInterval : NICE_INTERVALS[0]!;
  }

  if (currentInterval <= 0) {
    return findBestInterval(viewportDuration, widthPx);
  }

  const currentSpacingPx = (currentInterval / viewportDuration) * widthPx;

  if (
    currentSpacingPx >= HYSTERESIS_LOW_PX &&
    currentSpacingPx <= HYSTERESIS_HIGH_PX
  ) {
    return currentInterval;
  }

  if (!bypassCooldown && now - lastChangeTime < CHANGE_COOLDOWN_MS) {
    return currentInterval;
  }

  if (currentSpacingPx < HYSTERESIS_LOW_PX) {
    for (const interval of NICE_INTERVALS) {
      if (interval > currentInterval) return interval;
    }
    return currentInterval;
  }

  if (currentSpacingPx > HYSTERESIS_HIGH_PX) {
    if (mode === 'follow-latest') return currentInterval;
    for (let i = NICE_INTERVALS.length - 1; i >= 0; i--) {
      if (NICE_INTERVALS[i]! < currentInterval) return NICE_INTERVALS[i]!;
    }
    return currentInterval;
  }

  return currentInterval;
}

export function applyTickCountGuardrail(
  viewportDuration: number,
  interval: number,
  mode: TimelineZoomMode,
): number {
  if (interval <= 0 || viewportDuration <= 0) return interval;

  const count = viewportDuration / interval;

  if (count > MAX_TICK_COUNT) {
    for (const candidate of NICE_INTERVALS) {
      if (candidate >= interval && viewportDuration / candidate <= MAX_TICK_COUNT) {
        return candidate;
      }
    }
    return Math.ceil(viewportDuration / MAX_TICK_COUNT);
  }

  if (count < MIN_TICK_COUNT && mode !== 'follow-latest') {
    for (let i = NICE_INTERVALS.length - 1; i >= 0; i--) {
      const candidate = NICE_INTERVALS[i]!;
      if (viewportDuration / candidate >= MIN_TICK_COUNT) return candidate;
    }
    return NICE_INTERVALS[0]!;
  }

  return interval;
}

export function useTimelineZoom({
  rangeStart,
  rangeEnd,
  isComplete,
  isStreaming,
  containerWidthPx,
}: {
  rangeStart: number;
  rangeEnd: number;
  isComplete: boolean;
  isStreaming: boolean;
  containerWidthPx: number;
}): TimelineZoomOutput {
  const [inspectViewport, setInspectViewport] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const prevCoordinateWindowRef = useRef(FLOOR_COORDINATE_WINDOW);
  const prevIntervalRef = useRef(0);
  const lastIntervalChangeTimeRef = useRef(0);
  const prevRangeDurationRef = useRef(0);
  const prevModeRef = useRef<TimelineZoomMode>('follow-latest');
  const prevWidthRef = useRef(containerWidthPx);

  const coordinateStartRef = useRef(0);
  const coordinateEndRef = useRef(0);
  const viewportStartRef = useRef(0);
  const viewportEndRef = useRef(0);
  const rangeDurationRef = useRef(0);
  const containerWidthPxRef = useRef(containerWidthPx);
  const rightEdgeStickyRef = useRef(false);
  const fullRangeFollowRef = useRef(false);

  containerWidthPxRef.current = containerWidthPx;

  const rawRangeDuration = Math.max(0, rangeEnd - rangeStart);
  const rangeDuration = Math.max(prevRangeDurationRef.current, rawRangeDuration);
  prevRangeDurationRef.current = rangeDuration;
  rangeDurationRef.current = rangeDuration;

  const mode: TimelineZoomMode = isComplete
    ? 'static'
    : isStreaming && inspectViewport === null
      ? 'follow-latest'
      : 'inspect';

  const modeJustChanged = prevModeRef.current !== mode;
  prevModeRef.current = mode;

  const widthJustChanged = Math.abs(prevWidthRef.current - containerWidthPx) > 1;
  prevWidthRef.current = containerWidthPx;

  const bypassCooldown = modeJustChanged || widthJustChanged;

  if (mode === 'follow-latest') {
    rightEdgeStickyRef.current = false;
    fullRangeFollowRef.current = false;
  }

  let coordinateStart: number;
  let coordinateEnd: number;
  let viewportStart: number;
  let viewportEnd: number;
  let overviewStart: number;
  let overviewEnd: number;

  if (mode === 'follow-latest') {
    const coordinateWindow = selectCoordinateWindow(
      rangeDuration,
      prevCoordinateWindowRef.current,
    );
    prevCoordinateWindowRef.current = coordinateWindow;

    coordinateStart = rangeStart;

    if (rangeDuration < FOLLOW_LATEST_THRESHOLD) {
      viewportStart = coordinateStart;
      viewportEnd = coordinateStart + Math.max(rangeDuration, FLOOR_VIEWPORT_RIGHT);
    } else {
      const followWindow = computeFollowLatestViewportWindow(rangeDuration);
      viewportEnd = coordinateStart + rangeDuration;
      viewportStart = coordinateStart + Math.max(0, rangeDuration - followWindow);
    }

    coordinateEnd = viewportEnd;
    overviewStart = coordinateStart;
    overviewEnd = viewportEnd;
  } else if (mode === 'inspect') {
    coordinateStart = rangeStart;
    coordinateEnd = rangeStart + rangeDuration;

    if (inspectViewport) {
      if (!isComplete && isStreaming && fullRangeFollowRef.current) {
        viewportStart = coordinateStart;
        viewportEnd = coordinateEnd;
      } else {
        viewportStart = inspectViewport.start;
        viewportEnd = inspectViewport.end;

        if (!isComplete && rightEdgeStickyRef.current) {
          const stickyEnd = rangeStart + rangeDuration;
          const stickyDuration = inspectViewport.end - inspectViewport.start;
          viewportEnd = stickyEnd;
          viewportStart = stickyEnd - stickyDuration;
        }
      }
    } else {
      viewportStart = coordinateStart;
      viewportEnd = coordinateEnd;
    }

    overviewStart = coordinateStart;
    overviewEnd = coordinateEnd;
  } else {
    coordinateStart = rangeStart;
    coordinateEnd = rangeStart + rangeDuration;

    if (inspectViewport) {
      viewportStart = inspectViewport.start;
      viewportEnd = inspectViewport.end;
    } else {
      viewportStart = coordinateStart;
      viewportEnd = coordinateEnd;
    }

    overviewStart = coordinateStart;
    overviewEnd = coordinateEnd;
  }

  coordinateStartRef.current = coordinateStart;
  coordinateEndRef.current = coordinateEnd;
  viewportStartRef.current = viewportStart;
  viewportEndRef.current = viewportEnd;

  const viewportDuration = Math.max(
    MIN_VIEWPORT_DURATION,
    viewportEnd - viewportStart,
  );
  const coordinateDuration = coordinateEnd - coordinateStart;
  const zoomLevel =
    coordinateDuration > 0 ? coordinateDuration / viewportDuration : 1;
  const offsetPercent =
    coordinateDuration > 0
      ? ((viewportStart - coordinateStart) / coordinateDuration) * 100
      : 0;

  const isFullRange =
    inspectViewport === null || Math.abs(zoomLevel - 1) < 0.01;
  const canFollowLatest = mode === 'inspect' && isStreaming;
  const latestEdge = coordinateStart + rangeDuration;
  const latestSnapThreshold = Math.max(
    rangeDuration * STICKY_SNAP_FRACTION,
    (STICKY_SNAP_MIN_PX / Math.max(1, containerWidthPx)) *
      Math.max(1, coordinateDuration),
  );
  const isInspectAtLatestEdge =
    mode === 'inspect' &&
    isStreaming &&
    viewportEnd >= latestEdge - latestSnapThreshold;

  const now = Date.now();
  const intervalMode = isInspectAtLatestEdge ? 'follow-latest' : mode;
  const rawInterval = selectTickInterval(
    viewportDuration,
    containerWidthPx,
    prevIntervalRef.current,
    lastIntervalChangeTimeRef.current,
    intervalMode,
    now,
    bypassCooldown,
  );
  const tickInterval = applyTickCountGuardrail(
    viewportDuration,
    rawInterval,
    intervalMode,
  );

  if (tickInterval !== prevIntervalRef.current) {
    lastIntervalChangeTimeRef.current = now;
    prevIntervalRef.current = tickInterval;
  }

  const setViewport = useCallback((newStart: number, newEnd: number) => {
    const duration = newEnd - newStart;
    if (duration < MIN_VIEWPORT_DURATION) return;

    const currentRangeDuration = rangeDurationRef.current;
    const coordinateStart = coordinateStartRef.current;
    const coordinateEnd = coordinateEndRef.current;
    const latest = coordinateStart + currentRangeDuration;
    const coordinateDuration = coordinateEnd - coordinateStart;
    const prevDuration = viewportEndRef.current - viewportStartRef.current;
    const isFullRangeViewport =
      Math.abs(newStart - coordinateStart) <= 0.5 &&
      Math.abs(newEnd - coordinateEnd) <= 0.5;
    fullRangeFollowRef.current = isFullRangeViewport;
    const isPanMove = Math.abs(duration - prevDuration) < 0.5;

    if (isFullRangeViewport) {
      rightEdgeStickyRef.current = false;
    } else if (prevModeRef.current === 'follow-latest' || isPanMove) {
      rightEdgeStickyRef.current = false;
    } else if (currentRangeDuration > 0 && coordinateDuration > 0) {
      const snapThreshold = Math.max(
        currentRangeDuration * STICKY_SNAP_FRACTION,
        (STICKY_SNAP_MIN_PX / Math.max(1, containerWidthPxRef.current)) *
          coordinateDuration,
      );
      rightEdgeStickyRef.current = newEnd >= latest - snapThreshold;
    }

    setInspectViewport({ start: newStart, end: newEnd });
  }, []);

  const resetViewport = useCallback(() => {
    rightEdgeStickyRef.current = false;
    fullRangeFollowRef.current = false;
    setInspectViewport(null);
  }, []);

  const panViewport = useCallback((deltaMs: number) => {
    const wasFullRangeFollow = fullRangeFollowRef.current;
    fullRangeFollowRef.current = false;
    rightEdgeStickyRef.current = false;
    setInspectViewport((prev) => {
      const coordinateStart = coordinateStartRef.current;
      const coordinateEnd = coordinateEndRef.current;
      const viewportStart = wasFullRangeFollow
        ? viewportStartRef.current
        : (prev?.start ?? viewportStartRef.current);
      const viewportEnd = wasFullRangeFollow
        ? viewportEndRef.current
        : (prev?.end ?? viewportEndRef.current);
      const viewportDuration = viewportEnd - viewportStart;

      const newStart = Math.max(
        coordinateStart,
        Math.min(coordinateEnd - viewportDuration, viewportStart + deltaMs),
      );
      const newEnd = newStart + viewportDuration;

      return { start: newStart, end: newEnd };
    });
  }, []);

  const followLatest = useCallback(() => {
    prevCoordinateWindowRef.current = FLOOR_COORDINATE_WINDOW;
    prevIntervalRef.current = 0;
    lastIntervalChangeTimeRef.current = 0;
    rightEdgeStickyRef.current = false;
    fullRangeFollowRef.current = false;
    setInspectViewport(null);
  }, []);

  return useMemo(
    () => ({
      mode,
      coordinateStart,
      coordinateEnd,
      rangeDuration,
      viewportStart,
      viewportEnd,
      viewportDuration,
      zoomLevel,
      offsetPercent,
      tickInterval,
      isFullRange,
      canFollowLatest,
      overviewStart,
      overviewEnd,
      setViewport,
      resetViewport,
      panViewport,
      followLatest,
    }),
    [
      mode,
      coordinateStart,
      coordinateEnd,
      rangeDuration,
      viewportStart,
      viewportEnd,
      viewportDuration,
      zoomLevel,
      offsetPercent,
      tickInterval,
      isFullRange,
      canFollowLatest,
      overviewStart,
      overviewEnd,
      setViewport,
      resetViewport,
      panViewport,
      followLatest,
    ],
  );
}
