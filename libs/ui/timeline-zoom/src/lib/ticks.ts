import {
  CHANGE_COOLDOWN_MS,
  FOLLOW_LATEST_UPSHIFT_TRIGGER_PX,
  HYSTERESIS_HIGH_PX,
  HYSTERESIS_LOW_PX,
  MAX_TICK_COUNT,
  MIN_TICK_COUNT,
  NICE_INTERVALS,
  TARGET_MAJOR_SPACING_PX,
} from './constants';
import type { TimelineZoomMode } from './types';

const MIN_INTERVAL = NICE_INTERVALS[0] ?? 1;

function selectFallbackIntervalForUnknownWidth(
  visibleWindowDurationMs: number,
): number {
  if (visibleWindowDurationMs <= 0) {
    return MIN_INTERVAL;
  }

  const budgetInterval = visibleWindowDurationMs / MAX_TICK_COUNT;
  for (const candidate of NICE_INTERVALS) {
    if (candidate >= budgetInterval) {
      return candidate;
    }
  }

  return Math.max(1, Math.ceil(budgetInterval));
}

function stepUpshiftInterval(currentIntervalMs: number): number {
  if (currentIntervalMs <= 0) {
    return MIN_INTERVAL;
  }
  return Math.max(1, Math.ceil(currentIntervalMs * 2));
}

function stepDownshiftInterval(currentIntervalMs: number): number {
  if (currentIntervalMs <= 1) {
    return 1;
  }
  return Math.max(1, Math.floor(currentIntervalMs / 2));
}

function upshiftToFitMaxTickCount(
  visibleWindowDurationMs: number,
  intervalMs: number,
): number {
  const minimumIntervalMs = Math.max(
    1,
    Math.ceil(visibleWindowDurationMs / MAX_TICK_COUNT),
  );
  let nextIntervalMs = Math.max(intervalMs, 1);

  if (nextIntervalMs <= 2) {
    nextIntervalMs = Math.max(
      nextIntervalMs,
      selectFallbackIntervalForUnknownWidth(visibleWindowDurationMs),
    );
  }

  while (nextIntervalMs < minimumIntervalMs) {
    const steppedIntervalMs = stepUpshiftInterval(nextIntervalMs);
    if (steppedIntervalMs === nextIntervalMs) {
      break;
    }
    nextIntervalMs = steppedIntervalMs;
  }

  return nextIntervalMs;
}

function downshiftToFitMinTickCount(
  visibleWindowDurationMs: number,
  intervalMs: number,
): number {
  const maximumIntervalMs = Math.max(
    1,
    Math.floor(visibleWindowDurationMs / MIN_TICK_COUNT),
  );
  let nextIntervalMs = Math.max(intervalMs, 1);

  while (nextIntervalMs > maximumIntervalMs) {
    const steppedIntervalMs = stepDownshiftInterval(nextIntervalMs);
    if (steppedIntervalMs === nextIntervalMs) {
      break;
    }
    nextIntervalMs = steppedIntervalMs;
  }

  return nextIntervalMs;
}

/**
 * Finds the interval whose pixel spacing is closest to the target major-tick spacing.
 */
function findBestTickInterval(
  visibleWindowDurationMs: number,
  widthPx: number,
): number {
  if (widthPx <= 0 || visibleWindowDurationMs <= 0) {
    return MIN_INTERVAL;
  }

  let best = MIN_INTERVAL;
  let bestDiff = Infinity;

  for (const interval of NICE_INTERVALS) {
    const spacing = (interval / visibleWindowDurationMs) * widthPx;
    const diff = Math.abs(spacing - TARGET_MAJOR_SPACING_PX);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = interval;
    }
  }

  return best;
}

/**
 * Selects the next major-tick interval using hysteresis and cooldown.
 */
export function selectTickInterval(
  visibleWindowDurationMs: number,
  widthPx: number,
  currentIntervalMs: number,
  lastChangeTimeMs: number,
  timelineMode: TimelineZoomMode,
  nowMs: number,
  bypassCooldown: boolean,
): number {
  if (widthPx <= 0 || visibleWindowDurationMs <= 0) {
    return currentIntervalMs > 0
      ? currentIntervalMs
      : selectFallbackIntervalForUnknownWidth(visibleWindowDurationMs);
  }

  if (currentIntervalMs <= 0) {
    return findBestTickInterval(visibleWindowDurationMs, widthPx);
  }

  const lowThresholdPx =
    timelineMode === 'follow-latest'
      ? Math.max(HYSTERESIS_LOW_PX, FOLLOW_LATEST_UPSHIFT_TRIGGER_PX)
      : HYSTERESIS_LOW_PX;
  const currentSpacingPx = (currentIntervalMs / visibleWindowDurationMs) * widthPx;

  if (currentSpacingPx >= lowThresholdPx && currentSpacingPx <= HYSTERESIS_HIGH_PX) {
    return currentIntervalMs;
  }

  if (!bypassCooldown && nowMs - lastChangeTimeMs < CHANGE_COOLDOWN_MS) {
    return currentIntervalMs;
  }

  if (currentSpacingPx < lowThresholdPx) {
    return stepUpshiftInterval(currentIntervalMs);
  }

  if (currentSpacingPx > HYSTERESIS_HIGH_PX) {
    if (timelineMode === 'follow-latest') return currentIntervalMs;
    return stepDownshiftInterval(currentIntervalMs);
  }

  return currentIntervalMs;
}

/**
 * Clamps interval choice so tick count stays within the configured min/max bounds.
 */
export function applyTickCountGuardrail(
  visibleWindowDurationMs: number,
  intervalMs: number,
  timelineMode: TimelineZoomMode,
): number {
  if (intervalMs <= 0 || visibleWindowDurationMs <= 0) return intervalMs;

  const count = visibleWindowDurationMs / intervalMs;

  if (count > MAX_TICK_COUNT) {
    return upshiftToFitMaxTickCount(visibleWindowDurationMs, intervalMs);
  }

  if (count < MIN_TICK_COUNT && timelineMode !== 'follow-latest') {
    return downshiftToFitMinTickCount(visibleWindowDurationMs, intervalMs);
  }

  return intervalMs;
}
