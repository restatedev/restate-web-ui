import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineMode } from './TimelineEngineContext';

const DEFAULT_INTERVAL_BUFFER_RATIO = 0.35;
const DEFAULT_INTERVAL_MIN_BUFFER_MS = 1_000;
const DEFAULT_MERGE_PREPARE_DURATION_MS = 120;
const DEFAULT_MERGE_REMOVE_DELAY_MS = 120;

export interface IntervalSlotAnchors {
  anchorStartMs: number;
  anchorEndMs: number;
}

export interface TimelineIntervalSegment {
  startMs: number;
  endMs: number;
  key: string;
  gridIndex: number;
  widthPercent: number;
  isEven: boolean;
  mergedIsEven: boolean;
  labelBoundaryMs: number | null;
}

export interface TimelineIntervalMergeTransition {
  fromIntervalMs: number;
  toIntervalMs: number;
  phase: 'prepare' | 'collapse';
}

export interface UseTimelineIntervalSlotsOptions {
  durationMs: number;
  viewportStartOffsetMs: number;
  viewportEndOffsetMs: number;
  targetIntervalMs: number;
  mode: TimelineMode;
  transitionDurationMs: number;
  bufferRatio?: number;
  minBufferMs?: number;
  mergePrepareDurationMs?: number;
  mergeRemoveDelayMs?: number;
}

export interface UseTimelineIntervalSlotsResult {
  mergeTransition: TimelineIntervalMergeTransition | null;
  segments: TimelineIntervalSegment[];
  leadingSpacerPercent: number;
  shouldAnimateSlotWidth: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeInterval(intervalMs: number): number {
  return Math.max(1, Math.floor(intervalMs));
}

export function resolveIntervalSlotAnchors({
  durationMs,
  viewportStartOffsetMs,
  viewportEndOffsetMs,
  unitMs,
  bufferRatio = DEFAULT_INTERVAL_BUFFER_RATIO,
  minBufferMs = DEFAULT_INTERVAL_MIN_BUFFER_MS,
}: {
  durationMs: number;
  viewportStartOffsetMs: number;
  viewportEndOffsetMs: number;
  unitMs: number;
  bufferRatio?: number;
  minBufferMs?: number;
}): IntervalSlotAnchors | null {
  if (durationMs <= 0 || unitMs <= 0) {
    return null;
  }

  const visibleLeft = clamp(viewportStartOffsetMs, 0, durationMs);
  const visibleRight = clamp(viewportEndOffsetMs, 0, durationMs);
  if (visibleRight <= visibleLeft) {
    return null;
  }

  const visibleDuration = visibleRight - visibleLeft;
  const sideBufferMs = Math.max(
    unitMs,
    minBufferMs,
    visibleDuration * bufferRatio,
  );
  const anchorStartMs = Math.max(0, visibleLeft - sideBufferMs);
  const anchorEndMs = Math.max(
    anchorStartMs + unitMs,
    visibleRight + sideBufferMs,
  );

  return {
    anchorStartMs,
    anchorEndMs,
  };
}

function buildIntervalSlotSegments({
  durationMs,
  viewportStartOffsetMs,
  viewportEndOffsetMs,
  intervalMs,
  mergeAnchors,
  bufferRatio,
  minBufferMs,
}: {
  durationMs: number;
  viewportStartOffsetMs: number;
  viewportEndOffsetMs: number;
  intervalMs: number;
  mergeAnchors: IntervalSlotAnchors | null;
  bufferRatio: number;
  minBufferMs: number;
}): {
  segments: TimelineIntervalSegment[];
  leadingSpacerPercent: number;
  firstRenderedSlotIndex: number | null;
} {
  const safeDurationMs = Math.max(1, durationMs);
  if (durationMs <= 0 || intervalMs <= 0) {
    return {
      segments: [],
      leadingSpacerPercent: 0,
      firstRenderedSlotIndex: null,
    };
  }

  const fallbackAnchors = resolveIntervalSlotAnchors({
    durationMs,
    viewportStartOffsetMs,
    viewportEndOffsetMs,
    unitMs: intervalMs,
    bufferRatio,
    minBufferMs,
  });
  const anchorStartMs =
    mergeAnchors?.anchorStartMs ?? fallbackAnchors?.anchorStartMs ?? 0;
  const anchorEndMs =
    mergeAnchors?.anchorEndMs ?? fallbackAnchors?.anchorEndMs ?? 0;

  if (anchorEndMs <= anchorStartMs) {
    return {
      segments: [],
      leadingSpacerPercent: 0,
      firstRenderedSlotIndex: null,
    };
  }

  const firstRenderedSlotIndex = Math.floor(anchorStartMs / intervalMs);
  const lastRenderedSlotIndex = Math.max(
    firstRenderedSlotIndex,
    Math.ceil(anchorEndMs / intervalMs) - 1,
  );
  const leadingSpacerPercent = (anchorStartMs / safeDurationMs) * 100;

  const segments: TimelineIntervalSegment[] = [];
  for (
    let slotIndex = firstRenderedSlotIndex;
    slotIndex <= lastRenderedSlotIndex;
    slotIndex++
  ) {
    const slotStartMs = slotIndex * intervalMs;
    const slotEndMs = slotStartMs + intervalMs;
    const segmentStartMs = Math.max(anchorStartMs, slotStartMs);
    const segmentEndMs = Math.min(anchorEndMs, slotEndMs);
    const segmentDurationMs = segmentEndMs - segmentStartMs;
    if (segmentDurationMs <= 0) {
      continue;
    }

    const isFullSlot =
      Math.abs(segmentStartMs - slotStartMs) < 0.001 &&
      Math.abs(segmentEndMs - slotEndMs) < 0.001;

    segments.push({
      startMs: segmentStartMs,
      endMs: segmentEndMs,
      key: `${intervalMs}-${slotIndex}`,
      gridIndex: slotIndex,
      widthPercent: (segmentDurationMs / safeDurationMs) * 100,
      isEven: slotIndex % 2 === 0,
      mergedIsEven: Math.floor(slotIndex / 2) % 2 === 0,
      labelBoundaryMs: isFullSlot && slotEndMs <= durationMs ? slotEndMs : null,
    });
  }

  return {
    segments,
    leadingSpacerPercent,
    firstRenderedSlotIndex,
  };
}

export function useTimelineIntervalSlots({
  durationMs,
  viewportStartOffsetMs,
  viewportEndOffsetMs,
  targetIntervalMs,
  mode,
  transitionDurationMs,
  bufferRatio = DEFAULT_INTERVAL_BUFFER_RATIO,
  minBufferMs = DEFAULT_INTERVAL_MIN_BUFFER_MS,
  mergePrepareDurationMs = DEFAULT_MERGE_PREPARE_DURATION_MS,
  mergeRemoveDelayMs = DEFAULT_MERGE_REMOVE_DELAY_MS,
}: UseTimelineIntervalSlotsOptions): UseTimelineIntervalSlotsResult {
  const [intervalMs, setIntervalMs] = useState(() =>
    normalizeInterval(targetIntervalMs),
  );
  const [mergeTransition, setMergeTransition] =
    useState<TimelineIntervalMergeTransition | null>(null);
  const [mergeAnchors, setMergeAnchors] = useState<IntervalSlotAnchors | null>(
    null,
  );

  const mergePrepareTimeoutRef = useRef<number | null>(null);
  const mergeCommitTimeoutRef = useRef<number | null>(null);
  const mergeSnapshotClearFrameRef = useRef<number | null>(null);
  const previousLayoutRef = useRef<{
    intervalMs: number;
    firstRenderedSlotIndex: number | null;
    segmentCount: number;
  } | null>(null);

  const clearScheduledMerge = useCallback(() => {
    if (mergePrepareTimeoutRef.current !== null) {
      window.clearTimeout(mergePrepareTimeoutRef.current);
      mergePrepareTimeoutRef.current = null;
    }
    if (mergeCommitTimeoutRef.current !== null) {
      window.clearTimeout(mergeCommitTimeoutRef.current);
      mergeCommitTimeoutRef.current = null;
    }
    if (mergeSnapshotClearFrameRef.current !== null) {
      window.cancelAnimationFrame(mergeSnapshotClearFrameRef.current);
      mergeSnapshotClearFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearScheduledMerge();
    };
  }, [clearScheduledMerge]);

  useEffect(() => {
    const normalizedTargetIntervalMs = normalizeInterval(targetIntervalMs);
    const nextAppliedTargetIntervalMs =
      mode === 'live-follow' && normalizedTargetIntervalMs > intervalMs
        ? Math.min(normalizedTargetIntervalMs, intervalMs * 2)
        : normalizedTargetIntervalMs;

    if (
      nextAppliedTargetIntervalMs === intervalMs &&
      mergeTransition === null
    ) {
      return;
    }

    if (mergeTransition !== null) {
      const isStillTransitioningToSameTarget =
        mergeTransition.fromIntervalMs === intervalMs &&
        mergeTransition.toIntervalMs === nextAppliedTargetIntervalMs;
      if (isStillTransitioningToSameTarget) {
        return;
      }

      clearScheduledMerge();
      setMergeTransition(null);
      setMergeAnchors(null);
      if (nextAppliedTargetIntervalMs !== intervalMs) {
        setIntervalMs(nextAppliedTargetIntervalMs);
      }
      return;
    }

    const canAnimatePairMerge =
      mode === 'live-follow' && nextAppliedTargetIntervalMs === intervalMs * 2;
    if (canAnimatePairMerge) {
      clearScheduledMerge();

      const anchors = resolveIntervalSlotAnchors({
        durationMs,
        viewportStartOffsetMs,
        viewportEndOffsetMs,
        unitMs: intervalMs,
        bufferRatio,
        minBufferMs,
      });

      setMergeTransition({
        fromIntervalMs: intervalMs,
        toIntervalMs: nextAppliedTargetIntervalMs,
        phase: 'prepare',
      });
      setMergeAnchors(anchors);

      mergePrepareTimeoutRef.current = window.setTimeout(() => {
        setMergeTransition((current) => {
          if (
            current &&
            current.fromIntervalMs === intervalMs &&
            current.toIntervalMs === nextAppliedTargetIntervalMs &&
            current.phase === 'prepare'
          ) {
            return {
              ...current,
              phase: 'collapse',
            };
          }
          return current;
        });
        mergePrepareTimeoutRef.current = null;
      }, mergePrepareDurationMs);

      mergeCommitTimeoutRef.current = window.setTimeout(
        () => {
          setIntervalMs(nextAppliedTargetIntervalMs);
          setMergeTransition(null);
          if (mergeSnapshotClearFrameRef.current !== null) {
            window.cancelAnimationFrame(mergeSnapshotClearFrameRef.current);
            mergeSnapshotClearFrameRef.current = null;
          }
          mergeSnapshotClearFrameRef.current = window.requestAnimationFrame(
            () => {
              setMergeAnchors(null);
              mergeSnapshotClearFrameRef.current = null;
            },
          );
          mergeCommitTimeoutRef.current = null;
        },
        mergePrepareDurationMs + transitionDurationMs + mergeRemoveDelayMs,
      );
      return;
    }

    clearScheduledMerge();
    setMergeTransition(null);
    setMergeAnchors(null);
    setIntervalMs(nextAppliedTargetIntervalMs);
  }, [
    targetIntervalMs,
    intervalMs,
    mergeTransition,
    mode,
    durationMs,
    viewportStartOffsetMs,
    viewportEndOffsetMs,
    bufferRatio,
    minBufferMs,
    transitionDurationMs,
    mergePrepareDurationMs,
    mergeRemoveDelayMs,
    clearScheduledMerge,
  ]);

  const slotModel = useMemo(
    () =>
      buildIntervalSlotSegments({
        durationMs,
        viewportStartOffsetMs,
        viewportEndOffsetMs,
        intervalMs: normalizeInterval(intervalMs),
        mergeAnchors,
        bufferRatio,
        minBufferMs,
      }),
    [
      durationMs,
      viewportStartOffsetMs,
      viewportEndOffsetMs,
      intervalMs,
      mergeAnchors,
      bufferRatio,
      minBufferMs,
    ],
  );

  const previousLayout = previousLayoutRef.current;
  const hasStableLayout =
    previousLayout !== null &&
    previousLayout.intervalMs === intervalMs &&
    previousLayout.firstRenderedSlotIndex ===
      slotModel.firstRenderedSlotIndex &&
    previousLayout.segmentCount === slotModel.segments.length;
  const isSingleSlotShiftLayout =
    previousLayout !== null &&
    previousLayout.intervalMs === intervalMs &&
    previousLayout.segmentCount === slotModel.segments.length &&
    previousLayout.firstRenderedSlotIndex !== null &&
    slotModel.firstRenderedSlotIndex !== null &&
    Math.abs(
      previousLayout.firstRenderedSlotIndex - slotModel.firstRenderedSlotIndex,
    ) === 1;

  const shouldAnimateSlotWidth =
    mergeTransition !== null ||
    (mode === 'live-follow' && (hasStableLayout || isSingleSlotShiftLayout));

  previousLayoutRef.current = {
    intervalMs,
    firstRenderedSlotIndex: slotModel.firstRenderedSlotIndex,
    segmentCount: slotModel.segments.length,
  };

  return {
    mergeTransition,
    segments: slotModel.segments,
    leadingSpacerPercent: slotModel.leadingSpacerPercent,
    shouldAnimateSlotWidth,
  };
}
