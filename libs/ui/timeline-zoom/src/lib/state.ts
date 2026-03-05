import {
  FLOOR_COORDINATE_WINDOW,
  INITIAL_VIEWPORT_CONTROLLER_STATE,
  MIN_VISIBLE_WINDOW_DURATION,
} from './constants';
import {
  computeLatestSnapThreshold,
  resolveDomainWindows,
  resolveTimelineMode,
} from './mode';
import { applyTickCountGuardrail, selectTickInterval } from './ticks';
import { viewportControllerReducer } from './viewportController';
import type {
  DerivedTimelineFrame,
  TimelineInputs,
  TimelineZoomAction,
  TimelineZoomState,
  ViewportControllerState,
  WindowRange,
} from './types';

/**
 * Compares optional window ranges by value.
 */
function areWindowRangesEqual(a: WindowRange | null, b: WindowRange | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.startMs === b.startMs && a.endMs === b.endMs;
}

/**
 * Compares viewport-controller state to avoid unnecessary reducer updates.
 */
function isViewportControllerEqual(
  a: ViewportControllerState,
  b: ViewportControllerState,
): boolean {
  return (
    areWindowRangesEqual(a.manualVisibleWindow, b.manualVisibleWindow) &&
    a.stickyToLatestEdge === b.stickyToLatestEdge &&
    a.keepFullRangeWhileStreaming === b.keepFullRangeWhileStreaming
  );
}

/**
 * Compares timeline inputs by value.
 */
function areTimelineInputsEqual(a: TimelineInputs, b: TimelineInputs): boolean {
  return (
    a.rangeStartMs === b.rangeStartMs &&
    a.rangeEndMs === b.rangeEndMs &&
    a.isComplete === b.isComplete &&
    a.isStreaming === b.isStreaming &&
    a.containerWidthPx === b.containerWidthPx
  );
}

/**
 * Derives a render frame from reducer state and latest timeline inputs.
 */
export function deriveTimelineFrame(
  state: TimelineZoomState,
  inputs: TimelineInputs,
): DerivedTimelineFrame {
  const timelineMode = resolveTimelineMode(
    inputs.isComplete,
    inputs.isStreaming,
    state.viewportController.manualVisibleWindow,
  );

  const modeChanged = state.previousTimelineMode !== timelineMode;
  const widthChanged =
    Math.abs(state.previousContainerWidthPx - inputs.containerWidthPx) > 1;
  const bypassCooldown = modeChanged || widthChanged;

  const rawRangeDurationMs = Math.max(0, inputs.rangeEndMs - inputs.rangeStartMs);
  const observedRangeDurationMs = Math.max(
    state.observedRangeDurationMs,
    rawRangeDurationMs,
  );

  const domainWindows = resolveDomainWindows({
    timelineMode,
    rangeStartMs: inputs.rangeStartMs,
    observedRangeDurationMs,
    viewportController: state.viewportController,
    isComplete: inputs.isComplete,
    isStreaming: inputs.isStreaming,
    currentCoordinateWindowMs: state.coordinateWindowMs,
  });

  const visibleWindowDurationMs = Math.max(
    MIN_VISIBLE_WINDOW_DURATION,
    domainWindows.visibleWindowEndMs - domainWindows.visibleWindowStartMs,
  );

  const renderDomainDurationMs =
    domainWindows.renderDomainEndMs - domainWindows.renderDomainStartMs;

  const zoomFactor =
    renderDomainDurationMs > 0
      ? renderDomainDurationMs / visibleWindowDurationMs
      : 1;

  const offsetWithinRenderDomainPercent =
    renderDomainDurationMs > 0
      ? ((domainWindows.visibleWindowStartMs - domainWindows.renderDomainStartMs) /
          renderDomainDurationMs) *
        100
      : 0;

  const isViewingFullRange =
    state.viewportController.manualVisibleWindow === null ||
    Math.abs(zoomFactor - 1) < 0.01;

  const canFollowLatest = timelineMode === 'inspect' && inputs.isStreaming;
  const latestEdgeMs = inputs.rangeStartMs + observedRangeDurationMs;
  const latestEdgeThresholdMs = computeLatestSnapThreshold(
    observedRangeDurationMs,
    renderDomainDurationMs,
    inputs.containerWidthPx,
  );

  const isInspectAtLatestEdge =
    timelineMode === 'inspect' &&
    inputs.isStreaming &&
    domainWindows.visibleWindowEndMs >= latestEdgeMs - latestEdgeThresholdMs;

  const intervalSelectionMode = isInspectAtLatestEdge
    ? 'follow-latest'
    : timelineMode;

  const nowMs = Date.now();
  const rawMajorTickIntervalMs = selectTickInterval(
    visibleWindowDurationMs,
    inputs.containerWidthPx,
    state.majorTickIntervalMs,
    state.majorTickIntervalChangedAtMs,
    intervalSelectionMode,
    nowMs,
    bypassCooldown,
  );

  const majorTickIntervalMs = applyTickCountGuardrail(
    visibleWindowDurationMs,
    rawMajorTickIntervalMs,
    intervalSelectionMode,
  );

  const majorTickIntervalChangedAtMs =
    majorTickIntervalMs !== state.majorTickIntervalMs
      ? nowMs
      : state.majorTickIntervalChangedAtMs;

  return {
    timelineMode,
    observedRangeDurationMs,
    domainWindows,
    visibleWindowDurationMs,
    zoomFactor,
    offsetWithinRenderDomainPercent,
    majorTickIntervalMs,
    majorTickIntervalChangedAtMs,
    isViewingFullRange,
    canFollowLatest,
    latestEdgeMs,
  };
}

/**
 * Commits derived values into reducer memory only when something actually changed.
 */
function commitDerivedMemory(
  state: TimelineZoomState,
  derived: DerivedTimelineFrame,
  containerWidthPx: number,
  viewportController: ViewportControllerState = state.viewportController,
  latestInputs: TimelineInputs = state.latestInputs,
): TimelineZoomState {
  const hasViewportControllerChanged = !isViewportControllerEqual(
    state.viewportController,
    viewportController,
  );

  const hasObservedRangeDurationChanged =
    state.observedRangeDurationMs !== derived.observedRangeDurationMs;

  const hasCoordinateWindowChanged =
    state.coordinateWindowMs !== derived.domainWindows.coordinateWindowMs;

  const hasMajorTickIntervalChanged =
    state.majorTickIntervalMs !== derived.majorTickIntervalMs;

  const hasMajorTickIntervalChangedAtChanged =
    state.majorTickIntervalChangedAtMs !== derived.majorTickIntervalChangedAtMs;

  const hasPreviousModeChanged =
    state.previousTimelineMode !== derived.timelineMode;

  const hasPreviousContainerWidthChanged =
    state.previousContainerWidthPx !== containerWidthPx;

  const hasLatestInputsChanged = !areTimelineInputsEqual(
    state.latestInputs,
    latestInputs,
  );

  if (
    !hasViewportControllerChanged &&
    !hasObservedRangeDurationChanged &&
    !hasCoordinateWindowChanged &&
    !hasMajorTickIntervalChanged &&
    !hasMajorTickIntervalChangedAtChanged &&
    !hasPreviousModeChanged &&
    !hasPreviousContainerWidthChanged &&
    !hasLatestInputsChanged
  ) {
    return state;
  }

  return {
    viewportController,
    observedRangeDurationMs: derived.observedRangeDurationMs,
    coordinateWindowMs: derived.domainWindows.coordinateWindowMs,
    majorTickIntervalMs: derived.majorTickIntervalMs,
    majorTickIntervalChangedAtMs: derived.majorTickIntervalChangedAtMs,
    previousTimelineMode: derived.timelineMode,
    previousContainerWidthPx: containerWidthPx,
    latestInputs,
  };
}

/**
 * Creates reducer state from initial timeline inputs.
 */
export function createInitialTimelineZoomState(
  inputs: TimelineInputs,
): TimelineZoomState {
  return {
    viewportController: INITIAL_VIEWPORT_CONTROLLER_STATE,
    observedRangeDurationMs: Math.max(0, inputs.rangeEndMs - inputs.rangeStartMs),
    coordinateWindowMs: FLOOR_COORDINATE_WINDOW,
    majorTickIntervalMs: 0,
    majorTickIntervalChangedAtMs: 0,
    previousTimelineMode: resolveTimelineMode(
      inputs.isComplete,
      inputs.isStreaming,
      null,
    ),
    previousContainerWidthPx: inputs.containerWidthPx,
    latestInputs: inputs,
  };
}

/**
 * Main reducer handling sync, pan, set-window, reset, and return-to-live actions.
 */
export function timelineZoomReducer(
  state: TimelineZoomState,
  action: TimelineZoomAction,
): TimelineZoomState {
  if (action.type === 'reset-automatic') {
    if (
      isViewportControllerEqual(
        state.viewportController,
        INITIAL_VIEWPORT_CONTROLLER_STATE,
      )
    ) {
      return state;
    }

    return {
      ...state,
      viewportController: INITIAL_VIEWPORT_CONTROLLER_STATE,
    };
  }

  if (action.type === 'follow-latest') {
    const nextState: TimelineZoomState = {
      ...state,
      viewportController: INITIAL_VIEWPORT_CONTROLLER_STATE,
      coordinateWindowMs: FLOOR_COORDINATE_WINDOW,
      majorTickIntervalMs: 0,
      majorTickIntervalChangedAtMs: 0,
      previousTimelineMode: 'follow-latest',
    };

    if (
      isViewportControllerEqual(
        nextState.viewportController,
        state.viewportController,
      ) &&
      nextState.coordinateWindowMs === state.coordinateWindowMs &&
      nextState.majorTickIntervalMs === state.majorTickIntervalMs &&
      nextState.majorTickIntervalChangedAtMs ===
        state.majorTickIntervalChangedAtMs &&
      nextState.previousTimelineMode === state.previousTimelineMode
    ) {
      return state;
    }

    return nextState;
  }

  if (action.type === 'sync-inputs') {
    const derived = deriveTimelineFrame(state, action.inputs);
    return commitDerivedMemory(
      state,
      derived,
      action.inputs.containerWidthPx,
      state.viewportController,
      action.inputs,
    );
  }

  if (action.type === 'set-window') {
    const derivedBeforeAction = deriveTimelineFrame(state, state.latestInputs);

    const nextViewportController = viewportControllerReducer(
      state.viewportController,
      {
        type: 'set-window',
        window: action.window,
        previousVisibleWindowDurationMs: derivedBeforeAction.visibleWindowDurationMs,
        previousTimelineMode: derivedBeforeAction.timelineMode,
        renderDomainStartMs: derivedBeforeAction.domainWindows.renderDomainStartMs,
        renderDomainEndMs: derivedBeforeAction.domainWindows.renderDomainEndMs,
        latestEdgeMs: derivedBeforeAction.latestEdgeMs,
        observedRangeDurationMs: derivedBeforeAction.observedRangeDurationMs,
        containerWidthPx: state.latestInputs.containerWidthPx,
      },
    );

    const stateWithNextViewport = {
      ...state,
      viewportController: nextViewportController,
    };

    const derivedAfterAction = deriveTimelineFrame(
      stateWithNextViewport,
      state.latestInputs,
    );

    return commitDerivedMemory(
      state,
      derivedAfterAction,
      state.latestInputs.containerWidthPx,
      nextViewportController,
    );
  }

  const derivedBeforeAction = deriveTimelineFrame(state, state.latestInputs);

  const nextViewportController = viewportControllerReducer(state.viewportController, {
    type: 'pan-window',
    deltaMs: action.deltaMs,
    renderDomainStartMs: derivedBeforeAction.domainWindows.renderDomainStartMs,
    renderDomainEndMs: derivedBeforeAction.domainWindows.renderDomainEndMs,
    currentVisibleWindow: {
      startMs: derivedBeforeAction.domainWindows.visibleWindowStartMs,
      endMs: derivedBeforeAction.domainWindows.visibleWindowEndMs,
    },
  });

  const stateWithNextViewport = {
    ...state,
    viewportController: nextViewportController,
  };

  const derivedAfterAction = deriveTimelineFrame(
    stateWithNextViewport,
    state.latestInputs,
  );

  return commitDerivedMemory(
    state,
    derivedAfterAction,
    state.latestInputs.containerWidthPx,
    nextViewportController,
  );
}
