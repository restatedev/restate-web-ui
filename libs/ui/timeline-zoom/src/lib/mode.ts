import {
  COORDINATE_WINDOW_STEPS,
  DAY_MS,
  FLOOR_COORDINATE_WINDOW,
  FLOOR_FOLLOW_LATEST_END,
  FOLLOW_LATEST_STEPS,
  FOLLOW_LATEST_THRESHOLD,
  OVERSHOOT_FACTOR,
  STICKY_SNAP_FRACTION,
  STICKY_SNAP_MIN_PX,
} from './constants';
import type {
  DomainWindows,
  TimelineZoomMode,
  ViewportControllerState,
} from './types';

/**
 * Resolves the interaction mode from stream/completion status and manual viewport presence.
 */
export function resolveTimelineMode(
  isComplete: boolean,
  isStreaming: boolean,
  manualVisibleWindow: { startMs: number; endMs: number } | null,
): TimelineZoomMode {
  if (isComplete) return 'static';
  if (isStreaming && manualVisibleWindow === null) return 'follow-latest';
  return 'inspect';
}

/**
 * Grows the coordinate window in monotonic step sizes as observed duration expands.
 */
export function selectCoordinateWindow(
  observedRangeDurationMs: number,
  currentCoordinateWindowMs: number,
): number {
  const desired = Math.max(
    observedRangeDurationMs * OVERSHOOT_FACTOR,
    FLOOR_COORDINATE_WINDOW,
  );

  for (const step of COORDINATE_WINDOW_STEPS) {
    if (step >= desired) return Math.max(currentCoordinateWindowMs, step);
  }

  const coordinateWindow = Math.ceil(desired / DAY_MS) * DAY_MS;
  return Math.max(currentCoordinateWindowMs, coordinateWindow);
}

/**
 * Chooses the trailing follow window size from predefined steps.
 */
function computeFollowLatestWindow(observedRangeDurationMs: number): number {
  const target = observedRangeDurationMs * 0.5;
  let windowSize = FOLLOW_LATEST_STEPS[0]!;

  for (const step of FOLLOW_LATEST_STEPS) {
    if (step <= target) {
      windowSize = step;
    } else {
      break;
    }
  }

  return Math.max(windowSize, 15_000);
}

/**
 * Computes how close the visible end must be to the latest edge to snap/stick to it.
 */
export function computeLatestSnapThreshold(
  observedRangeDurationMs: number,
  renderDomainDurationMs: number,
  containerWidthPx: number,
): number {
  return Math.max(
    observedRangeDurationMs * STICKY_SNAP_FRACTION,
    (STICKY_SNAP_MIN_PX / Math.max(1, containerWidthPx)) *
      Math.max(1, renderDomainDurationMs),
  );
}

/**
 * Derives render/visible/selector domains from current mode and viewport-controller state.
 */
export function resolveDomainWindows({
  timelineMode,
  rangeStartMs,
  observedRangeDurationMs,
  viewportController,
  isComplete,
  isStreaming,
  currentCoordinateWindowMs,
}: {
  timelineMode: TimelineZoomMode;
  rangeStartMs: number;
  observedRangeDurationMs: number;
  viewportController: ViewportControllerState;
  isComplete: boolean;
  isStreaming: boolean;
  currentCoordinateWindowMs: number;
}): DomainWindows {
  if (timelineMode === 'follow-latest') {
    const nextCoordinateWindow = selectCoordinateWindow(
      observedRangeDurationMs,
      currentCoordinateWindowMs,
    );

    const renderDomainStartMs = rangeStartMs;
    let visibleWindowStartMs: number;
    let visibleWindowEndMs: number;

    if (observedRangeDurationMs < FOLLOW_LATEST_THRESHOLD) {
      visibleWindowStartMs = renderDomainStartMs;
      visibleWindowEndMs =
        renderDomainStartMs +
        Math.max(observedRangeDurationMs, FLOOR_FOLLOW_LATEST_END);
    } else {
      const followWindow = computeFollowLatestWindow(observedRangeDurationMs);
      visibleWindowEndMs = renderDomainStartMs + observedRangeDurationMs;
      visibleWindowStartMs =
        renderDomainStartMs + Math.max(0, observedRangeDurationMs - followWindow);
    }

    return {
      renderDomainStartMs,
      renderDomainEndMs: visibleWindowEndMs,
      visibleWindowStartMs,
      visibleWindowEndMs,
      selectorDomainStartMs: renderDomainStartMs,
      selectorDomainEndMs: visibleWindowEndMs,
      coordinateWindowMs: nextCoordinateWindow,
    };
  }

  const renderDomainStartMs = rangeStartMs;
  const renderDomainEndMs = rangeStartMs + observedRangeDurationMs;

  if (timelineMode === 'inspect') {
    if (!viewportController.manualVisibleWindow) {
      return {
        renderDomainStartMs,
        renderDomainEndMs,
        visibleWindowStartMs: renderDomainStartMs,
        visibleWindowEndMs: renderDomainEndMs,
        selectorDomainStartMs: renderDomainStartMs,
        selectorDomainEndMs: renderDomainEndMs,
        coordinateWindowMs: currentCoordinateWindowMs,
      };
    }

    if (
      !isComplete &&
      isStreaming &&
      viewportController.keepFullRangeWhileStreaming
    ) {
      return {
        renderDomainStartMs,
        renderDomainEndMs,
        visibleWindowStartMs: renderDomainStartMs,
        visibleWindowEndMs: renderDomainEndMs,
        selectorDomainStartMs: renderDomainStartMs,
        selectorDomainEndMs: renderDomainEndMs,
        coordinateWindowMs: currentCoordinateWindowMs,
      };
    }

    let visibleWindowStartMs = viewportController.manualVisibleWindow.startMs;
    let visibleWindowEndMs = viewportController.manualVisibleWindow.endMs;

    if (!isComplete && viewportController.stickyToLatestEdge) {
      const stickyDuration =
        viewportController.manualVisibleWindow.endMs -
        viewportController.manualVisibleWindow.startMs;
      visibleWindowEndMs = rangeStartMs + observedRangeDurationMs;
      visibleWindowStartMs = visibleWindowEndMs - stickyDuration;
    }

    return {
      renderDomainStartMs,
      renderDomainEndMs,
      visibleWindowStartMs,
      visibleWindowEndMs,
      selectorDomainStartMs: renderDomainStartMs,
      selectorDomainEndMs: renderDomainEndMs,
      coordinateWindowMs: currentCoordinateWindowMs,
    };
  }

  const visibleWindowStartMs =
    viewportController.manualVisibleWindow?.startMs ?? renderDomainStartMs;
  const visibleWindowEndMs =
    viewportController.manualVisibleWindow?.endMs ?? renderDomainEndMs;

  return {
    renderDomainStartMs,
    renderDomainEndMs,
    visibleWindowStartMs,
    visibleWindowEndMs,
    selectorDomainStartMs: renderDomainStartMs,
    selectorDomainEndMs: renderDomainEndMs,
    coordinateWindowMs: currentCoordinateWindowMs,
  };
}
