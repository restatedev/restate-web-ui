import type { Range } from '@tanstack/react-virtual';
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const IDLE_STEP_DELAY_MS = 30;
const NOT_READY_RETRY_MS = 300;

export type RenderWindowOptions = {
  overscan: number;
  scrollAhead: number;
  idleRowsAbove: number;
  idleRowsBelow: number;
  step: number;
  maxGrowth: number;
  idleStep: number;
};

type Bounds = { start: number; end: number };
type RenderWindow = Bounds & { indexes: number[]; version: number };
type Target = Bounds & { fromVersion: number };

type ScrollDirection = 'forward' | 'backward' | null;

export type RenderWindowHandle = {
  options: RenderWindowOptions;
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

export function useRenderWindow(
  options: RenderWindowOptions,
): RenderWindowHandle {
  const windowRef = useRef<RenderWindow | null>(null);
  const visibleRef = useRef<(Bounds & { count: number }) | null>(null);
  const appliedTargetRef = useRef<Target | null>(null);
  const scrollStateRef = useRef<{ scrollDirection: ScrollDirection } | null>(
    null,
  );
  const [target, setTarget] = useState<Target | null>(null);
  const { overscan, scrollAhead, step, maxGrowth } = options;
  const idleRowsAbove = Math.max(options.idleRowsAbove, overscan + step);
  const idleRowsBelow = Math.max(options.idleRowsBelow, overscan + step);

  const rangeExtractor = useCallback(
    (range: Range) => {
      const last = range.count - 1;
      const maxRows =
        range.endIndex -
        range.startIndex +
        1 +
        idleRowsAbove +
        idleRowsBelow +
        scrollAhead;
      visibleRef.current = {
        start: range.startIndex,
        end: range.endIndex,
        count: range.count,
      };
      const direction = scrollStateRef.current?.scrollDirection;
      const neededStart = Math.max(
        0,
        range.startIndex - (direction === 'backward' ? scrollAhead : overscan),
      );
      const neededEnd = Math.min(
        last,
        range.endIndex + (direction === 'forward' ? scrollAhead : overscan),
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
        start = Math.max(0, range.startIndex - overscan);
        end = Math.min(last, range.endIndex + overscan);
      } else {
        if (neededStart < start) {
          start = Math.max(
            0,
            neededStart - step,
            Math.min(range.startIndex - overscan, start - maxGrowth),
          );
          end = Math.min(end, start + maxRows - 1);
        }
        if (neededEnd > end) {
          end = Math.min(
            last,
            neededEnd + step,
            Math.max(range.endIndex + overscan, end + maxGrowth),
          );
          start = Math.max(start, end - maxRows + 1);
        }
      }

      if (!current || current.start !== start || current.end !== end) {
        windowRef.current = toWindow(start, end, (current?.version ?? 0) + 1);
      }
      return windowRef.current?.indexes ?? [];
    },
    [
      target,
      overscan,
      scrollAhead,
      step,
      maxGrowth,
      idleRowsAbove,
      idleRowsBelow,
    ],
  );

  return {
    options: { ...options, idleRowsAbove, idleRowsBelow },
    rangeExtractor,
    scrollStateRef,
    visibleRef,
    windowRef,
    setTarget,
  };
}

function getNextIdleBounds(
  visible: Bounds & { count: number },
  current: Bounds,
  rowsAbove: number,
  rowsBelow: number,
  idleStep: number,
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
      start: Math.max(targetStart, current.start - idleStep),
      end: current.end,
    };
  }
  if (current.end < targetEnd) {
    return {
      start: current.start,
      end: Math.min(targetEnd, current.end + idleStep),
    };
  }
  if (current.start < targetStart - idleStep) {
    return { start: current.start + idleStep, end: current.end };
  }
  if (current.end > targetEnd + idleStep) {
    return { start: current.start, end: current.end - idleStep };
  }
  return undefined;
}

export function useGrowRenderWindowWhenIdle(
  { options, visibleRef, windowRef, setTarget }: RenderWindowHandle,
  isScrolling: boolean,
  count: number,
  isLive: boolean,
) {
  const [step, setStep] = useState(0);
  const { idleRowsAbove, idleRowsBelow, idleStep } = options;

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
        isLive ? 0 : idleRowsAbove,
        isLive ? 0 : idleRowsBelow,
        idleStep,
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
  }, [
    isScrolling,
    isLive,
    step,
    count,
    visibleRef,
    windowRef,
    setTarget,
    idleRowsAbove,
    idleRowsBelow,
    idleStep,
  ]);
}
