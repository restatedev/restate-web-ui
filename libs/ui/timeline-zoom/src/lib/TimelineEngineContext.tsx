import {
  createContext,
  PropsWithChildren,
  use,
  useMemo,
} from 'react';
import { useTimelineZoom } from './useTimelineZoom';
import type { TimelineZoomMode } from './types';
import { usePresentedRangeEnd } from './usePresentedRangeEnd';

export type TimelineMode = 'live-follow' | 'inspect' | 'static';

export interface TimelineEngineOutput {
  mode: TimelineMode;
  coordinateStart: number;
  coordinateEnd: number;
  actualDuration: number;
  nowMs: number;
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

const TimelineEngineContext = createContext<TimelineEngineOutput | null>(null);

/**
 * Maps generic zoom-engine mode names to the feature-facing timeline mode names.
 */
function fromTimelineZoomMode(mode: TimelineZoomMode): TimelineMode {
  if (mode === 'follow-latest') {
    return 'live-follow';
  }
  return mode;
}

/**
 * Provides the timeline engine output consumed by journal timeline components.
 */
export function TimelineEngineProvider({
  actualStart,
  actualEnd,
  authoritativeNowMs,
  areAllCompleted,
  isLiveEnabled,
  containerWidthPx,
  children,
}: PropsWithChildren<{
  actualStart: number;
  actualEnd: number;
  authoritativeNowMs: number;
  areAllCompleted: boolean;
  isLiveEnabled: boolean;
  containerWidthPx: number;
}>) {
  const shouldAdvanceNow = isLiveEnabled && !areAllCompleted;
  const { rangeEndMs: effectiveRangeEndMs, nowMs: effectiveNowMs } =
    usePresentedRangeEnd({
      actualEndMs: actualEnd,
      authoritativeNowMs,
      shouldAdvance: shouldAdvanceNow,
    });

  const zoom = useTimelineZoom({
    rangeStartMs: actualStart,
    rangeEndMs: effectiveRangeEndMs,
    nowMs: effectiveNowMs,
    isComplete: areAllCompleted,
    isStreaming: isLiveEnabled,
    containerWidthPx,
  });

  const engine = useMemo<TimelineEngineOutput>(
    () => ({
      mode: fromTimelineZoomMode(zoom.timelineMode),
      coordinateStart: zoom.renderDomainStartMs,
      coordinateEnd: zoom.renderDomainEndMs,
      actualDuration: zoom.observedRangeDurationMs,
      nowMs: effectiveNowMs,
      viewportStart: zoom.visibleWindowStartMs,
      viewportEnd: zoom.visibleWindowEndMs,
      viewportDuration: zoom.visibleWindowDurationMs,
      zoomLevel: zoom.zoomFactor,
      offsetPercent: zoom.offsetWithinRenderDomainPercent,
      tickInterval: zoom.majorTickIntervalMs,
      isFullTrace: zoom.isViewingFullRange,
      canReturnToLive: zoom.canFollowLatest,
      overviewStart: zoom.selectorDomainStartMs,
      overviewEnd: zoom.selectorDomainEndMs,
      setViewport: zoom.setVisibleWindow,
      resetViewport: zoom.resetToAutomaticWindow,
      panViewport: zoom.panVisibleWindowBy,
      returnToLive: zoom.followLatest,
    }),
    [zoom, effectiveNowMs],
  );

  return (
    <TimelineEngineContext.Provider value={engine}>
      {children}
    </TimelineEngineContext.Provider>
  );
}

/**
 * Returns the current timeline engine context value.
 */
export function useTimelineEngineContext(): TimelineEngineOutput {
  const ctx = use(TimelineEngineContext);
  if (!ctx) {
    throw new Error(
      'useTimelineEngineContext must be used within a TimelineEngineProvider',
    );
  }
  return ctx;
}
