/**
 * Public surface for the headless timeline zoom engine.
 *
 * The engine is split into focused modules:
 * - `mode.ts`: mode resolution and domain/window calculations
 * - `ticks.ts`: major-tick interval selection and guardrails
 * - `state.ts`: reducer/state transitions and frame derivation
 * - `constants.ts`: shared numeric constraints and thresholds
 *
 * Keep imports from this facade so consumers do not depend on internal module layout.
 */

/**
 * Threshold where follow-latest transitions from full-range display to a trailing window.
 */
export { FOLLOW_LATEST_THRESHOLD } from './constants';

/**
 * Selects a monotonic coordinate window size based on observed duration growth.
 */
export { selectCoordinateWindow } from './mode';

/**
 * Selects the major tick interval and applies min/max tick-count guardrails.
 */
export { applyTickCountGuardrail, selectTickInterval } from './ticks';

/**
 * Reducer-state API used by `useTimelineZoom`.
 */
export {
  createInitialTimelineZoomState,
  deriveTimelineFrame,
  timelineZoomReducer,
} from './state';
