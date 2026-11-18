import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useTimelineZoom } from './useTimelineZoom';
import type { TimelineZoomMode } from './types';
import {
  getHeadroomStepMs,
  usePresentedRangeEnd,
} from './usePresentedRangeEnd';

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
  const headroomStepMsRef = useRef(0);
  const { rangeEndMs: effectiveRangeEndMs, nowMs: effectiveNowMs } =
    usePresentedRangeEnd({
      actualEndMs: actualEnd,
      authoritativeNowMs,
      shouldAdvance: shouldAdvanceNow,
      headroomStepMsRef,
    });

  const zoom = useTimelineZoom({
    rangeStartMs: actualStart,
    rangeEndMs: effectiveRangeEndMs,
    nowMs: effectiveNowMs,
    isComplete: areAllCompleted,
    isStreaming: isLiveEnabled,
    containerWidthPx,
  });

  useEffect(() => {
    headroomStepMsRef.current = getHeadroomStepMs(
      zoom.visibleWindowDurationMs,
      containerWidthPx,
    );
  }, [zoom.visibleWindowDurationMs, containerWidthPx]);

  const {
    timelineMode,
    renderDomainStartMs,
    renderDomainEndMs,
    observedRangeDurationMs,
    visibleWindowStartMs,
    visibleWindowEndMs,
    visibleWindowDurationMs,
    zoomFactor,
    offsetWithinRenderDomainPercent,
    majorTickIntervalMs,
    isViewingFullRange,
    canFollowLatest,
    selectorDomainStartMs,
    selectorDomainEndMs,
    setVisibleWindow,
    resetToAutomaticWindow,
    panVisibleWindowBy,
    followLatest,
  } = zoom;
  const engine = useMemo<TimelineEngineOutput>(
    () => ({
      mode: fromTimelineZoomMode(timelineMode),
      coordinateStart: renderDomainStartMs,
      coordinateEnd: renderDomainEndMs,
      actualDuration: observedRangeDurationMs,
      nowMs: effectiveNowMs,
      viewportStart: visibleWindowStartMs,
      viewportEnd: visibleWindowEndMs,
      viewportDuration: visibleWindowDurationMs,
      zoomLevel: zoomFactor,
      offsetPercent: offsetWithinRenderDomainPercent,
      tickInterval: majorTickIntervalMs,
      isFullTrace: isViewingFullRange,
      canReturnToLive: canFollowLatest,
      overviewStart: selectorDomainStartMs,
      overviewEnd: selectorDomainEndMs,
      setViewport: setVisibleWindow,
      resetViewport: resetToAutomaticWindow,
      panViewport: panVisibleWindowBy,
      returnToLive: followLatest,
    }),
    [
      timelineMode,
      renderDomainStartMs,
      renderDomainEndMs,
      observedRangeDurationMs,
      effectiveNowMs,
      visibleWindowStartMs,
      visibleWindowEndMs,
      visibleWindowDurationMs,
      zoomFactor,
      offsetWithinRenderDomainPercent,
      majorTickIntervalMs,
      isViewingFullRange,
      canFollowLatest,
      selectorDomainStartMs,
      selectorDomainEndMs,
      setVisibleWindow,
      resetToAutomaticWindow,
      panVisibleWindowBy,
      followLatest,
    ],
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
