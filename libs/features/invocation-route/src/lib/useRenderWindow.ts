import type { Range } from '@tanstack/react-virtual';
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const MIN_OVERSCAN = 24;
const SCROLL_AHEAD = 100;
const IDLE_ROWS_ABOVE = 100;
const IDLE_ROWS_BELOW = 300;
const MOUNTS_ACROSS_FRAMES =
  typeof CSS !== 'undefined' && CSS.supports('-moz-appearance', 'none');
const STEP = MOUNTS_ACROSS_FRAMES ? 5 : 25;
const MAX_GROWTH = MOUNTS_ACROSS_FRAMES ? 20 : Infinity;
const IDLE_STEP = 50;
const MAX_ROWS = IDLE_ROWS_ABOVE + IDLE_ROWS_BELOW + 100;
const IDLE_STEP_DELAY_MS = 30;
const NOT_READY_RETRY_MS = 300;

type Bounds = { start: number; end: number };
type RenderWindow = Bounds & { indexes: number[]; version: number };
type Target = Bounds & { fromVersion: number };

type ScrollDirection = 'forward' | 'backward' | null;

export type RenderWindowHandle = {
  rangeExtractor: (range: Range) => number[];
  scrollStateRef: { current: { scrollDirection: ScrollDirection } | null };
  visibleRef: { current: (Bounds & { count: number }) | null };
  windowRef: { current: RenderWindow | null };
  setTarget: (target: Target) => void;
};

function toWindow(start: number, end: number, version: number): RenderWindow {
  const indexes: number[] = [];
  for (let index = start; index <= end; index++) {
    indexes.push(index);
  }
  return { start, end, indexes, version };
}

export function useRenderWindow(): RenderWindowHandle {
  const windowRef = useRef<RenderWindow | null>(null);
  const visibleRef = useRef<(Bounds & { count: number }) | null>(null);
  const appliedTargetRef = useRef<Target | null>(null);
  const scrollStateRef = useRef<{ scrollDirection: ScrollDirection } | null>(
    null,
  );
  const [target, setTarget] = useState<Target | null>(null);

  const rangeExtractor = useCallback(
    (range: Range) => {
      const last = range.count - 1;
      visibleRef.current = {
        start: range.startIndex,
        end: range.endIndex,
        count: range.count,
      };
      const direction = scrollStateRef.current?.scrollDirection;
      const neededStart = Math.max(
        0,
        range.startIndex -
          (direction === 'backward' ? SCROLL_AHEAD : MIN_OVERSCAN),
      );
      const neededEnd = Math.min(
        last,
        range.endIndex +
          (direction === 'forward' ? SCROLL_AHEAD : MIN_OVERSCAN),
      );
      const current = windowRef.current;
      const base =
        target &&
        target !== appliedTargetRef.current &&
        target.fromVersion === current?.version
          ? target
          : current;
      appliedTargetRef.current = target;

      let start = base?.start ?? neededStart;
      let end = Math.min(last, base?.end ?? neededEnd);
      if (end < neededStart || start > neededEnd) {
        start = Math.max(0, range.startIndex - MIN_OVERSCAN);
        end = Math.min(last, range.endIndex + MIN_OVERSCAN);
      } else {
        if (neededStart < start) {
          start = Math.max(
            0,
            neededStart - STEP,
            Math.min(range.startIndex - MIN_OVERSCAN, start - MAX_GROWTH),
          );
          end = Math.min(end, start + MAX_ROWS - 1);
        }
        if (neededEnd > end) {
          end = Math.min(
            last,
            neededEnd + STEP,
            Math.max(range.endIndex + MIN_OVERSCAN, end + MAX_GROWTH),
          );
          start = Math.max(start, end - MAX_ROWS + 1);
        }
      }

      if (!current || current.start !== start || current.end !== end) {
        windowRef.current = toWindow(start, end, (current?.version ?? 0) + 1);
      }
      return windowRef.current?.indexes ?? [];
    },
    [target],
  );

  return { rangeExtractor, scrollStateRef, visibleRef, windowRef, setTarget };
}

function getNextIdleBounds(
  visible: Bounds & { count: number },
  current: Bounds,
  rowsAbove: number,
  rowsBelow: number,
): Bounds | undefined {
  const last = visible.count - 1;
  const targetStart = Math.max(0, visible.start - rowsAbove);
  const targetEnd = Math.min(last, visible.end + rowsBelow);
  const before = visible.start - current.start;
  const after = current.end - visible.end;

  if (
    current.start > targetStart &&
    (before <= after || current.end >= targetEnd)
  ) {
    return {
      start: Math.max(targetStart, current.start - IDLE_STEP),
      end: current.end,
    };
  }
  if (current.end < targetEnd) {
    return {
      start: current.start,
      end: Math.min(targetEnd, current.end + IDLE_STEP),
    };
  }
  if (current.start < targetStart - IDLE_STEP) {
    return { start: current.start + IDLE_STEP, end: current.end };
  }
  if (current.end > targetEnd + IDLE_STEP) {
    return { start: current.start, end: current.end - IDLE_STEP };
  }
  return undefined;
}

export function useGrowRenderWindowWhenIdle(
  { visibleRef, windowRef, setTarget }: RenderWindowHandle,
  isScrolling: boolean,
  count: number,
  isLive: boolean,
) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (count === 0) {
      visibleRef.current = null;
      windowRef.current = null;
      return;
    }
    if (isScrolling) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    const grow = () => {
      const visible = visibleRef.current;
      const current = windowRef.current;
      if (!visible || !current) {
        timeout = setTimeout(grow, NOT_READY_RETRY_MS);
        return;
      }
      const next = getNextIdleBounds(
        visible,
        current,
        isLive ? 0 : IDLE_ROWS_ABOVE,
        isLive ? 0 : IDLE_ROWS_BELOW,
      );
      if (next) {
        startTransition(() => {
          setTarget({ ...next, fromVersion: current.version });
          setStep((value) => value + 1);
        });
      }
    };
    timeout = setTimeout(grow, IDLE_STEP_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [isScrolling, isLive, step, count, visibleRef, windowRef, setTarget]);
}
