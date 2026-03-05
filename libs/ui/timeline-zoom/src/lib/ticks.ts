import {
  CHANGE_COOLDOWN_MS,
  HYSTERESIS_HIGH_PX,
  HYSTERESIS_LOW_PX,
  MAX_TICK_COUNT,
  MIN_TICK_COUNT,
  NICE_INTERVALS,
  TARGET_MAJOR_SPACING_PX,
} from './constants';
import type { TimelineZoomMode } from './types';

/**
 * Finds the interval whose pixel spacing is closest to the target major-tick spacing.
 */
function findBestTickInterval(
  visibleWindowDurationMs: number,
  widthPx: number,
): number {
  if (widthPx <= 0 || visibleWindowDurationMs <= 0) {
    return NICE_INTERVALS[0]!;
  }

  let best = NICE_INTERVALS[0]!;
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
    return currentIntervalMs > 0 ? currentIntervalMs : NICE_INTERVALS[0]!;
  }

  if (currentIntervalMs <= 0) {
    return findBestTickInterval(visibleWindowDurationMs, widthPx);
  }

  const currentSpacingPx = (currentIntervalMs / visibleWindowDurationMs) * widthPx;

  if (
    currentSpacingPx >= HYSTERESIS_LOW_PX &&
    currentSpacingPx <= HYSTERESIS_HIGH_PX
  ) {
    return currentIntervalMs;
  }

  if (!bypassCooldown && nowMs - lastChangeTimeMs < CHANGE_COOLDOWN_MS) {
    return currentIntervalMs;
  }

  if (currentSpacingPx < HYSTERESIS_LOW_PX) {
    for (const interval of NICE_INTERVALS) {
      if (interval > currentIntervalMs) return interval;
    }
    return currentIntervalMs;
  }

  if (currentSpacingPx > HYSTERESIS_HIGH_PX) {
    if (timelineMode === 'follow-latest') return currentIntervalMs;
    for (let i = NICE_INTERVALS.length - 1; i >= 0; i--) {
      if (NICE_INTERVALS[i]! < currentIntervalMs) return NICE_INTERVALS[i]!;
    }
    return currentIntervalMs;
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
    for (const candidate of NICE_INTERVALS) {
      if (
        candidate >= intervalMs &&
        visibleWindowDurationMs / candidate <= MAX_TICK_COUNT
      ) {
        return candidate;
      }
    }
    return Math.ceil(visibleWindowDurationMs / MAX_TICK_COUNT);
  }

  if (count < MIN_TICK_COUNT && timelineMode !== 'follow-latest') {
    for (let i = NICE_INTERVALS.length - 1; i >= 0; i--) {
      const candidate = NICE_INTERVALS[i]!;
      if (visibleWindowDurationMs / candidate >= MIN_TICK_COUNT) return candidate;
    }
    return NICE_INTERVALS[0]!;
  }

  return intervalMs;
}
