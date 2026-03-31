import type { ViewportControllerState } from './types';

export const INITIAL_VIEWPORT_CONTROLLER_STATE: ViewportControllerState = {
  manualVisibleWindow: null,
  stickyToLatestEdge: false,
  keepFullRangeWhileStreaming: false,
};

export const FLOOR_COORDINATE_WINDOW = 10_000;
export const COORDINATE_WINDOW_STEPS = [
  10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000, 28_800_000, 43_200_000, 86_400_000,
];
export const OVERSHOOT_FACTOR = 1.15;
export const DAY_MS = 86_400_000;
export const MIN_VISIBLE_WINDOW_DURATION = 1;
export const FLOOR_FOLLOW_LATEST_END = 3_000;
export const FOLLOW_LATEST_STEPS = [
  15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000,
];
export const FOLLOW_LATEST_THRESHOLD = FOLLOW_LATEST_STEPS[0] ?? 15_000;
export const FOLLOW_LATEST_MIN_PAST_CONTEXT_MS = 3_000;
export const FOLLOW_LATEST_PAST_CONTEXT_RATIO = 0.25;

export const NICE_INTERVALS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000,
  30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
  7_200_000, 14_400_000, 28_800_000, 43_200_000,
];

export const TARGET_MAJOR_SPACING_PX = 100;
export const HYSTERESIS_LOW_PX = 70;
export const HYSTERESIS_HIGH_PX = 140;
export const FOLLOW_LATEST_UPSHIFT_TRIGGER_PX = 85;
export const CHANGE_COOLDOWN_MS = 800;
export const MIN_TICK_COUNT = 3;
export const MAX_TICK_COUNT = 10;
export const LIVE_TRANSITION_DURATION_MS = 300;
