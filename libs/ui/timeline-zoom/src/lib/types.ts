export type TimelineZoomMode = 'follow-latest' | 'inspect' | 'static';

export interface TimelineZoomOutput {
  /** Current timeline interaction mode. */
  timelineMode: TimelineZoomMode;
  /** Start of the domain used for rendering transforms and offsets. */
  renderDomainStartMs: number;
  /** End of the domain used for rendering transforms and offsets. */
  renderDomainEndMs: number;
  /** Monotonic observed trace duration (never shrinks while data updates). */
  observedRangeDurationMs: number;
  /** Visible window start timestamp. */
  visibleWindowStartMs: number;
  /** Visible window end timestamp. */
  visibleWindowEndMs: number;
  /** Visible window duration in milliseconds. */
  visibleWindowDurationMs: number;
  /** Ratio of render-domain duration to visible-window duration. */
  zoomFactor: number;
  /** Horizontal offset of the visible window inside render domain. */
  offsetWithinRenderDomainPercent: number;
  /** Major interval between timeline ticks. */
  majorTickIntervalMs: number;
  /** True when the visible window covers the full render domain. */
  isViewingFullRange: boolean;
  /** True when timeline can jump back to latest edge. */
  canFollowLatest: boolean;
  /** Start of the domain shown in the overview/selector strip. */
  selectorDomainStartMs: number;
  /** End of the domain shown in the overview/selector strip. */
  selectorDomainEndMs: number;
  /** Set visible window directly. */
  setVisibleWindow: (startMs: number, endMs: number) => void;
  /** Reset to automatic window behavior for the current mode. */
  resetToAutomaticWindow: () => void;
  /** Pan visible window by a delta in milliseconds. */
  panVisibleWindowBy: (deltaMs: number) => void;
  /** Force latest-edge following behavior. */
  followLatest: () => void;
}

export interface WindowRange {
  startMs: number;
  endMs: number;
}

export interface ViewportControllerState {
  manualVisibleWindow: WindowRange | null;
  stickyToLatestEdge: boolean;
  keepFullRangeWhileStreaming: boolean;
}

export type ViewportControllerAction =
  | {
      type: 'set-window';
      window: WindowRange;
      previousVisibleWindowDurationMs: number;
      previousTimelineMode: TimelineZoomMode;
      renderDomainStartMs: number;
      renderDomainEndMs: number;
      latestEdgeMs: number;
      observedRangeDurationMs: number;
      containerWidthPx: number;
    }
  | {
      type: 'pan-window';
      deltaMs: number;
      renderDomainStartMs: number;
      renderDomainEndMs: number;
      currentVisibleWindow: WindowRange;
    }
  | { type: 'reset-automatic' };

export interface DomainWindows {
  renderDomainStartMs: number;
  renderDomainEndMs: number;
  visibleWindowStartMs: number;
  visibleWindowEndMs: number;
  selectorDomainStartMs: number;
  selectorDomainEndMs: number;
  coordinateWindowMs: number;
}

export interface TimelineInputs {
  rangeStartMs: number;
  rangeEndMs: number;
  nowMs: number;
  isComplete: boolean;
  isStreaming: boolean;
  containerWidthPx: number;
}

export interface TimelineZoomState {
  viewportController: ViewportControllerState;
  observedRangeDurationMs: number;
  coordinateWindowMs: number;
  previousVisibleWindowDurationMs: number;
  majorTickIntervalMs: number;
  majorTickIntervalChangedAtMs: number;
  previousTimelineMode: TimelineZoomMode;
  previousContainerWidthPx: number;
  latestInputs: TimelineInputs;
}

export interface DerivedTimelineFrame {
  timelineMode: TimelineZoomMode;
  observedRangeDurationMs: number;
  domainWindows: DomainWindows;
  visibleWindowDurationMs: number;
  zoomFactor: number;
  offsetWithinRenderDomainPercent: number;
  majorTickIntervalMs: number;
  majorTickIntervalChangedAtMs: number;
  isViewingFullRange: boolean;
  canFollowLatest: boolean;
  latestEdgeMs: number;
}

export type TimelineZoomAction =
  | { type: 'sync-inputs'; inputs: TimelineInputs }
  | { type: 'set-window'; window: WindowRange }
  | { type: 'pan-window'; deltaMs: number }
  | { type: 'reset-automatic' }
  | { type: 'follow-latest' };
