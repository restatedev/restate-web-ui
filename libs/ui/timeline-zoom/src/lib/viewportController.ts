import {
  INITIAL_VIEWPORT_CONTROLLER_STATE,
  MIN_VISIBLE_WINDOW_DURATION,
} from './constants';
import type {
  ViewportControllerAction,
  ViewportControllerState,
} from './types';

/**
 * Applies viewport intent actions and keeps sticky/full-range flags in sync.
 */
export function viewportControllerReducer(
  state: ViewportControllerState,
  action: ViewportControllerAction,
): ViewportControllerState {
  if (action.type === 'reset-automatic') {
    return INITIAL_VIEWPORT_CONTROLLER_STATE;
  }

  if (action.type === 'pan-window') {
    const currentDuration =
      action.currentVisibleWindow.endMs - action.currentVisibleWindow.startMs;
    const maxStart = action.renderDomainEndMs - currentDuration;
    const nextStart = Math.max(
      action.renderDomainStartMs,
      Math.min(maxStart, action.currentVisibleWindow.startMs + action.deltaMs),
    );
    const nextEnd = nextStart + currentDuration;

    return {
      manualVisibleWindow: {
        startMs: nextStart,
        endMs: nextEnd,
      },
      stickyToLatestEdge: nextEnd >= action.renderDomainEndMs,
      keepFullRangeWhileStreaming: false,
    };
  }

  const nextDuration = action.window.endMs - action.window.startMs;
  if (nextDuration < MIN_VISIBLE_WINDOW_DURATION) {
    return state;
  }

  const isViewingFullRange =
    Math.abs(action.window.startMs - action.renderDomainStartMs) <= 0.5 &&
    Math.abs(action.window.endMs - action.renderDomainEndMs) <= 0.5;

  const isPanMove =
    Math.abs(nextDuration - action.previousVisibleWindowDurationMs) < 0.5;

  let stickyToLatestEdge = false;

  if (
    !isViewingFullRange &&
    action.previousTimelineMode !== 'follow-latest' &&
    isPanMove &&
    action.observedRangeDurationMs > 0
  ) {
    stickyToLatestEdge = action.window.endMs >= action.renderDomainEndMs;
  }

  return {
    manualVisibleWindow: action.window,
    stickyToLatestEdge,
    keepFullRangeWhileStreaming: isViewingFullRange,
  };
}
