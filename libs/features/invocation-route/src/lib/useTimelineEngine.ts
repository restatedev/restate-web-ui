import { useCallback, useMemo, useRef, useState } from 'react';

// Modes:
//   live-follow – trace is running, viewport auto-scrolls to follow the live edge
//   inspect     – trace may still be running but the user has panned/zoomed; viewport is manual
//   static      – all invocations completed, trace is frozen
export type TimelineMode = 'live-follow' | 'inspect' | 'static';

export interface TimelineEngineOutput {
  mode: TimelineMode;

  // Coordinate space – the full domain used for zoom/offset math.
  // In live-follow it equals the viewport; in inspect/static it spans the actual trace.
  coordinateStart: number;
  coordinateEnd: number;

  // Actual trace duration (ms) from the earliest entry to the latest known timestamp.
  // Monotonically non-decreasing (ratcheted) so the timeline never shrinks.
  actualDuration: number;

  // Viewport – the visible time window. A sub-range of the coordinate space when zoomed.
  viewportStart: number;
  viewportEnd: number;
  viewportDuration: number;

  // Derived zoom/offset values that drive CSS transforms
  zoomLevel: number;
  offsetPercent: number;
  tickInterval: number;
  isFullTrace: boolean;
  canReturnToLive: boolean;

  // Overview domain – used by the overview bar and ViewportSelector.
  // Always tight to the trace (no headroom) so entries fill the full overview width.
  overviewStart: number;
  overviewEnd: number;

  setViewport: (start: number, end: number) => void;
  resetViewport: () => void;
  panViewport: (deltaMs: number) => void;
  returnToLive: () => void;
}

// --- Coordinate window sizing (selectCoordinateWindow) ---
// Minimum coordinate window in ms (10s)
const FLOOR_COORDINATE_WINDOW = 10_000;
// Discrete step ladder for rounding up the coordinate window (10s … 1d)
const COORDINATE_WINDOW_STEPS = [
  10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000, 28_800_000, 43_200_000, 86_400_000,
];
// Multiplier applied to actualDuration before snapping to a window step
const OVERSHOOT_FACTOR = 1.15;
const DAY_MS = 86_400_000;

// --- Viewport constraints ---
// Smallest allowed viewport duration in ms (prevents division by zero)
const MIN_VIEWPORT_DURATION = 1;
// Minimum viewport right edge offset from start for short traces (3s)
const FLOOR_VIEWPORT_RIGHT = 3_000;

// --- Tail-follow (live-follow auto-scroll for long traces) ---
// Traces shorter than this show the full range; longer ones show a trailing window
// Discrete step ladder for the trailing viewport window (15s … 4h)
const TAIL_FOLLOW_STEPS = [
  15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000,
];
export const TAIL_FOLLOW_THRESHOLD = TAIL_FOLLOW_STEPS[0]!;

// --- Tick interval selection ---
// Candidate intervals for tick marks (1ms … 12h)
const NICE_INTERVALS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000,
  30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
  7_200_000, 14_400_000, 28_800_000, 43_200_000,
];
// Ideal pixel spacing between major tick marks
const TARGET_MAJOR_SPACING_PX = 100;
// Hysteresis band: don't change interval while spacing is within this range
const HYSTERESIS_LOW_PX = 70;
const HYSTERESIS_HIGH_PX = 140;
// Minimum time between interval changes to prevent rapid toggling
const CHANGE_COOLDOWN_MS = 800;
// Guardrails: clamp the number of visible ticks to this range
const MIN_TICK_COUNT = 3;
const MAX_TICK_COUNT = 10;

// --- Sticky right-edge snapping (overview bar drag) ---
// Fraction of actualDuration used as snap-to-live-edge threshold
const STICKY_SNAP_FRACTION = 0.05;
// Minimum snap threshold in pixels (converted to time at runtime)
const STICKY_SNAP_MIN_PX = 8;

export function selectCoordinateWindow(
  actualDuration: number,
  currentCoordinateWindow: number,
): number {
  const desired = Math.max(
    actualDuration * OVERSHOOT_FACTOR,
    FLOOR_COORDINATE_WINDOW,
  );

  for (const step of COORDINATE_WINDOW_STEPS) {
    if (step >= desired) return Math.max(currentCoordinateWindow, step);
  }

  const coordinateWindow = Math.ceil(desired / DAY_MS) * DAY_MS;
  return Math.max(currentCoordinateWindow, coordinateWindow);
}

function computeTailViewportWindow(actualDuration: number): number {
  const target = actualDuration * 0.5;
  let tailWindow = TAIL_FOLLOW_STEPS[0]!;
  for (const step of TAIL_FOLLOW_STEPS) {
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
  for (const ni of NICE_INTERVALS) {
    const spacing = (ni / viewportDuration) * widthPx;
    const diff = Math.abs(spacing - TARGET_MAJOR_SPACING_PX);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = ni;
    }
  }
  return best;
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
    for (const ni of NICE_INTERVALS) {
      if (ni > currentInterval) return ni;
    }
    return currentInterval;
  }

  if (currentSpacingPx > HYSTERESIS_HIGH_PX) {
    if (mode === 'live-follow') return currentInterval;
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
  mode: TimelineMode,
): number {
  if (interval <= 0 || viewportDuration <= 0) return interval;

  const count = viewportDuration / interval;

  if (count > MAX_TICK_COUNT) {
    for (const ni of NICE_INTERVALS) {
      if (ni >= interval && viewportDuration / ni <= MAX_TICK_COUNT) return ni;
    }
    return Math.ceil(viewportDuration / MAX_TICK_COUNT);
  }

  if (count < MIN_TICK_COUNT && mode !== 'live-follow') {
    for (let i = NICE_INTERVALS.length - 1; i >= 0; i--) {
      const ni = NICE_INTERVALS[i]!;
      if (viewportDuration / ni >= MIN_TICK_COUNT) return ni;
    }
    return NICE_INTERVALS[0]!;
  }

  return interval;
}

export function useTimelineEngine({
  actualStart,
  actualEnd,
  areAllCompleted,
  isLiveEnabled,
  containerWidthPx,
}: {
  // actualStart/actualEnd: wall-clock timestamps (ms) of the trace's first and last known events
  actualStart: number;
  actualEnd: number;
  areAllCompleted: boolean;
  isLiveEnabled: boolean;
  containerWidthPx: number;
}): TimelineEngineOutput {
  const [inspectViewport, setInspectViewport] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const prevCoordinateWindowRef = useRef(FLOOR_COORDINATE_WINDOW);
  const prevIntervalRef = useRef(0);
  const lastIntervalChangeTimeRef = useRef(0);
  const prevActualDurationRef = useRef(0);
  const prevModeRef = useRef<TimelineMode>('live-follow');
  const prevWidthRef = useRef(containerWidthPx);

  const coordinateStartRef = useRef(0);
  const coordinateEndRef = useRef(0);
  const viewportStartRef = useRef(0);
  const viewportEndRef = useRef(0);
  const actualDurationRef = useRef(0);
  const containerWidthPxRef = useRef(containerWidthPx);
  const rightEdgeStickyRef = useRef(false);

  containerWidthPxRef.current = containerWidthPx;

  const rawActualDuration = Math.max(0, actualEnd - actualStart);
  const actualDuration = Math.max(
    prevActualDurationRef.current,
    rawActualDuration,
  );
  prevActualDurationRef.current = actualDuration;
  actualDurationRef.current = actualDuration;

  const mode: TimelineMode = areAllCompleted
    ? 'static'
    : isLiveEnabled && inspectViewport === null
      ? 'live-follow'
      : 'inspect';

  const modeJustChanged = prevModeRef.current !== mode;
  prevModeRef.current = mode;

  const widthJustChanged =
    Math.abs(prevWidthRef.current - containerWidthPx) > 1;
  prevWidthRef.current = containerWidthPx;

  const bypassCooldown = modeJustChanged || widthJustChanged;

  if (mode === 'live-follow') {
    rightEdgeStickyRef.current = false;
  }

  let coordinateStart: number;
  let coordinateEnd: number;
  let viewportStart: number;
  let viewportEnd: number;
  let overviewStart: number;
  let overviewEnd: number;

  // live-follow: coordinate = viewport (tight to live edge), auto-scrolls
  if (mode === 'live-follow') {
    const coordinateWindow = selectCoordinateWindow(
      actualDuration,
      prevCoordinateWindowRef.current,
    );
    prevCoordinateWindowRef.current = coordinateWindow;

    coordinateStart = actualStart;

    if (actualDuration < TAIL_FOLLOW_THRESHOLD) {
      viewportStart = coordinateStart;
      viewportEnd =
        coordinateStart + Math.max(actualDuration, FLOOR_VIEWPORT_RIGHT);
    } else {
      const tailWindow = computeTailViewportWindow(actualDuration);
      viewportEnd = coordinateStart + actualDuration;
      viewportStart =
        coordinateStart + Math.max(0, actualDuration - tailWindow);
    }

    coordinateEnd = viewportEnd;
    overviewStart = coordinateStart;
    overviewEnd = viewportEnd;

    // inspect: coordinate spans the full actual trace, viewport is user-controlled
  } else if (mode === 'inspect') {
    coordinateStart = actualStart;
    coordinateEnd = actualStart + actualDuration;

    if (inspectViewport) {
      viewportStart = inspectViewport.start;
      viewportEnd = inspectViewport.end;

      // Sticky: slide the entire viewport to the live edge, preserving duration
      if (!areAllCompleted && rightEdgeStickyRef.current) {
        const stickyEnd = actualStart + actualDuration;
        const stickyDuration = inspectViewport.end - inspectViewport.start;
        viewportEnd = stickyEnd;
        viewportStart = stickyEnd - stickyDuration;
      }
    } else {
      viewportStart = coordinateStart;
      viewportEnd = coordinateEnd;
    }

    overviewStart = coordinateStart;
    overviewEnd = coordinateEnd;

    // static: all completed, coordinate = actual trace, viewport may be zoomed
  } else {
    coordinateStart = actualStart;
    coordinateEnd = actualStart + actualDuration;

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

  const isFullTrace =
    inspectViewport === null || Math.abs(zoomLevel - 1) < 0.01;
  const canReturnToLive = mode === 'inspect' && isLiveEnabled;

  const now = Date.now();
  const rawInterval = selectTickInterval(
    viewportDuration,
    containerWidthPx,
    prevIntervalRef.current,
    lastIntervalChangeTimeRef.current,
    mode,
    now,
    bypassCooldown,
  );
  const tickInterval = applyTickCountGuardrail(
    viewportDuration,
    rawInterval,
    mode,
  );

  if (tickInterval !== prevIntervalRef.current) {
    lastIntervalChangeTimeRef.current = now;
    prevIntervalRef.current = tickInterval;
  }

  const setViewport = useCallback((newStart: number, newEnd: number) => {
    const duration = newEnd - newStart;
    if (duration < MIN_VIEWPORT_DURATION) return;

    const ad = actualDurationRef.current;
    const coordStart = coordinateStartRef.current;
    const coordEnd = coordinateEndRef.current;
    const liveEdge = coordStart + ad;
    const coordDuration = coordEnd - coordStart;
    const prevDuration = viewportEndRef.current - viewportStartRef.current;
    const isPanMove = Math.abs(duration - prevDuration) < 0.5;
    if (prevModeRef.current === 'live-follow' || isPanMove) {
      rightEdgeStickyRef.current = false;
    } else if (ad > 0 && coordDuration > 0) {
      const snapThreshold = Math.max(
        ad * STICKY_SNAP_FRACTION,
        (STICKY_SNAP_MIN_PX / Math.max(1, containerWidthPxRef.current)) *
          coordDuration,
      );
      rightEdgeStickyRef.current = newEnd >= liveEdge - snapThreshold;
    }

    setInspectViewport({ start: newStart, end: newEnd });
  }, []);

  const resetViewport = useCallback(() => {
    rightEdgeStickyRef.current = false;
    setInspectViewport(null);
  }, []);

  const panViewport = useCallback((deltaMs: number) => {
    rightEdgeStickyRef.current = false;
    setInspectViewport((prev) => {
      const coordStart = coordinateStartRef.current;
      const coordEnd = coordinateEndRef.current;
      const vs = prev?.start ?? viewportStartRef.current;
      const ve = prev?.end ?? viewportEndRef.current;
      const vd = ve - vs;

      const newStart = Math.max(
        coordStart,
        Math.min(coordEnd - vd, vs + deltaMs),
      );
      const newEnd = newStart + vd;

      return { start: newStart, end: newEnd };
    });
  }, []);

  const returnToLive = useCallback(() => {
    prevCoordinateWindowRef.current = FLOOR_COORDINATE_WINDOW;
    prevIntervalRef.current = 0;
    lastIntervalChangeTimeRef.current = 0;
    rightEdgeStickyRef.current = false;
    setInspectViewport(null);
  }, []);

  return useMemo(
    () => ({
      mode,
      coordinateStart,
      coordinateEnd,
      actualDuration,
      viewportStart,
      viewportEnd,
      viewportDuration,
      zoomLevel,
      offsetPercent,
      tickInterval,
      isFullTrace,
      canReturnToLive,
      overviewStart,
      overviewEnd,
      setViewport,
      resetViewport,
      panViewport,
      returnToLive,
    }),
    [
      mode,
      coordinateStart,
      coordinateEnd,
      actualDuration,
      viewportStart,
      viewportEnd,
      viewportDuration,
      zoomLevel,
      offsetPercent,
      tickInterval,
      isFullTrace,
      canReturnToLive,
      overviewStart,
      overviewEnd,
      setViewport,
      resetViewport,
      panViewport,
      returnToLive,
    ],
  );
}
