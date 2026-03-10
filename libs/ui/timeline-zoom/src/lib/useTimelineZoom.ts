import { useCallback, useLayoutEffect, useReducer } from 'react';
import {
  applyTickCountGuardrail,
  createInitialTimelineZoomState,
  deriveTimelineFrame,
  FOLLOW_LATEST_THRESHOLD,
  selectCoordinateWindow,
  selectTickInterval,
  timelineZoomReducer,
} from './engine';
import type { TimelineInputs, TimelineZoomOutput } from './types';

export type { TimelineZoomMode, TimelineZoomOutput } from './types';
export {
  applyTickCountGuardrail,
  FOLLOW_LATEST_THRESHOLD,
  selectCoordinateWindow,
  selectTickInterval,
};

/**
 * Headless timeline zoom hook that derives render windows and exposes viewport actions.
 */
export function useTimelineZoom({
  rangeStartMs,
  rangeEndMs,
  nowMs,
  isComplete,
  isStreaming,
  containerWidthPx,
}: {
  rangeStartMs: number;
  rangeEndMs: number;
  nowMs: number;
  isComplete: boolean;
  isStreaming: boolean;
  containerWidthPx: number;
}): TimelineZoomOutput {
  const currentInputs: TimelineInputs = {
    rangeStartMs,
    rangeEndMs,
    nowMs,
    isComplete,
    isStreaming,
    containerWidthPx,
  };

  const [state, dispatch] = useReducer(
    timelineZoomReducer,
    currentInputs,
    createInitialTimelineZoomState,
  );

  useLayoutEffect(() => {
    dispatch({
      type: 'sync-inputs',
      inputs: currentInputs,
    });
  }, [
    rangeStartMs,
    rangeEndMs,
    nowMs,
    isComplete,
    isStreaming,
    containerWidthPx,
  ]);

  const derivedFrame = deriveTimelineFrame(state, currentInputs);

  /** Sets an explicit visible window in milliseconds. */
  const setVisibleWindow = useCallback((startMs: number, endMs: number) => {
    dispatch({
      type: 'set-window',
      window: { startMs, endMs },
    });
  }, []);

  /** Clears manual viewport control and returns to automatic behavior for the mode. */
  const resetToAutomaticWindow = useCallback(() => {
    dispatch({ type: 'reset-automatic' });
  }, []);

  /** Pans the current visible window by the given millisecond delta. */
  const panVisibleWindowBy = useCallback((deltaMs: number) => {
    dispatch({ type: 'pan-window', deltaMs });
  }, []);

  /** Forces return to latest-edge follow mode. */
  const followLatest = useCallback(() => {
    dispatch({ type: 'follow-latest' });
  }, []);

  return {
    timelineMode: derivedFrame.timelineMode,
    renderDomainStartMs: derivedFrame.domainWindows.renderDomainStartMs,
    renderDomainEndMs: derivedFrame.domainWindows.renderDomainEndMs,
    observedRangeDurationMs: derivedFrame.observedRangeDurationMs,
    visibleWindowStartMs: derivedFrame.domainWindows.visibleWindowStartMs,
    visibleWindowEndMs: derivedFrame.domainWindows.visibleWindowEndMs,
    visibleWindowDurationMs: derivedFrame.visibleWindowDurationMs,
    zoomFactor: derivedFrame.zoomFactor,
    offsetWithinRenderDomainPercent:
      derivedFrame.offsetWithinRenderDomainPercent,
    majorTickIntervalMs: derivedFrame.majorTickIntervalMs,
    isViewingFullRange: derivedFrame.isViewingFullRange,
    canFollowLatest: derivedFrame.canFollowLatest,
    selectorDomainStartMs: derivedFrame.domainWindows.selectorDomainStartMs,
    selectorDomainEndMs: derivedFrame.domainWindows.selectorDomainEndMs,
    setVisibleWindow,
    resetToAutomaticWindow,
    panVisibleWindowBy,
    followLatest,
  };
}
