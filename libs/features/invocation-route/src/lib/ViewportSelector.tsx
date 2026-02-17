import { useCallback, useRef, useTransition } from 'react';
import { useMove } from 'react-aria';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: '',
});

const panAreaStyles = tv({
  base: 'absolute inset-y-0 z-10 cursor-grab border-y-2 border-blue-500/40 bg-blue-500/5',
});

const MIN_VIEWPORT_DURATION = 100;
const MIN_VIEWPORT_WIDTH_PX = 72;
const HANDLE_WIDTH = 12;
const PADDING = 8;

export function ViewportSelector({
  className,
  start,
  end,
  viewportStart,
  viewportEnd,
  setViewport,
  onViewportChange,
}: {
  className?: string;
  start: number;
  end: number;
  viewportStart: number;
  viewportEnd: number;
  setViewport: (start: number, end: number) => void;
  onViewportChange?: (start: number, end: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const optimisticViewportRef = useRef<{ start: number; end: number } | null>(
    null,
  );

  const displayStart = optimisticViewportRef.current?.start ?? viewportStart;
  const displayEnd = optimisticViewportRef.current?.end ?? viewportEnd;

  const traceDuration = end - start;

  const pixelToTime = useCallback(
    (deltaX: number) => {
      if (!containerRef.current || traceDuration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      return (deltaX / rect.width) * traceDuration;
    },
    [traceDuration],
  );

  const getMinViewportDuration = useCallback(() => {
    if (!containerRef.current || traceDuration <= 0) {
      return MIN_VIEWPORT_DURATION;
    }
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) {
      return MIN_VIEWPORT_DURATION;
    }
    const minDurationFromPixels =
      (MIN_VIEWPORT_WIDTH_PX / rect.width) * traceDuration;
    return Math.max(MIN_VIEWPORT_DURATION, minDurationFromPixels);
  }, [traceDuration]);

  const { moveProps: leftHandleMoveProps } = useMove({
    onMoveStart() {
      optimisticViewportRef.current = {
        start: viewportStart,
        end: viewportEnd,
      };
    },
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const minViewportDuration = getMinViewportDuration();
      const prev = optimisticViewportRef.current ?? {
        start: viewportStart,
        end: viewportEnd,
      };
      const newStart = Math.max(
        start,
        Math.min(prev.start + deltaTime, prev.end - minViewportDuration),
      );
      optimisticViewportRef.current = { start: newStart, end: prev.end };
      startTransition(() => {
        onViewportChange?.(newStart, prev.end);
        setViewport(newStart, prev.end);
      });
    },
    onMoveEnd() {
      optimisticViewportRef.current = null;
    },
  });

  const { moveProps: rightHandleMoveProps } = useMove({
    onMoveStart() {
      optimisticViewportRef.current = {
        start: viewportStart,
        end: viewportEnd,
      };
    },
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const minViewportDuration = getMinViewportDuration();
      const prev = optimisticViewportRef.current ?? {
        start: viewportStart,
        end: viewportEnd,
      };
      const newEnd = Math.min(
        end,
        Math.max(prev.end + deltaTime, prev.start + minViewportDuration),
      );
      optimisticViewportRef.current = { start: prev.start, end: newEnd };
      startTransition(() => {
        onViewportChange?.(prev.start, newEnd);
        setViewport(prev.start, newEnd);
      });
    },
    onMoveEnd() {
      optimisticViewportRef.current = null;
    },
  });

  const { moveProps: panMoveProps } = useMove({
    onMoveStart() {
      optimisticViewportRef.current = {
        start: viewportStart,
        end: viewportEnd,
      };
    },
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const prev = optimisticViewportRef.current ?? {
        start: viewportStart,
        end: viewportEnd,
      };
      const viewportDuration = prev.end - prev.start;

      let newStart = prev.start + deltaTime;
      let newEnd = prev.end + deltaTime;

      if (newStart < start) {
        newStart = start;
        newEnd = start + viewportDuration;
      }
      if (newEnd > end) {
        newEnd = end;
        newStart = end - viewportDuration;
      }

      optimisticViewportRef.current = { start: newStart, end: newEnd };
      startTransition(() => {
        onViewportChange?.(newStart, newEnd);
        setViewport(newStart, newEnd);
      });
    },
    onMoveEnd() {
      optimisticViewportRef.current = null;
    },
  });

  const handleDoubleClick = useCallback(() => {
    setViewport(start, end);
  }, [start, end, setViewport]);

  if (traceDuration <= 0) return null;

  const leftPercent = ((displayStart - start) / traceDuration) * 100;
  const widthPercent = ((displayEnd - displayStart) / traceDuration) * 100;
  const rightPercent = 100 - leftPercent - widthPercent;

  const showLeftDim = leftPercent > 0.1;
  const showRightDim = rightPercent > 0.1;

  return (
    <div ref={containerRef} className={styles({ className })}>
      {/* Left dimmed area */}
      {showLeftDim && (
        <div
          className="absolute inset-y-0 left-2 rounded-l-md bg-gray-500/30"
          style={{
            width: `calc(${leftPercent}% - ${PADDING}px)`,
          }}
        />
      )}

      {/* Right dimmed area */}
      {showRightDim && (
        <div
          className="absolute inset-y-0 right-2 rounded-r-md bg-gray-500/30"
          style={{
            width: `calc(${rightPercent}% - ${PADDING}px)`,
          }}
        />
      )}

      {/* Left resize handle */}
      <div
        {...leftHandleMoveProps}
        tabIndex={0}
        className="absolute inset-y-0 z-20 flex w-3 cursor-ew-resize items-center justify-center rounded-l-sm bg-blue-500 hover:bg-blue-600"
        style={{
          left: `calc(${leftPercent}% + ${PADDING}px)`,
        }}
      >
        <div className="h-4 w-0.5 rounded-full bg-white/70" />
      </div>

      {/* Selection box - for panning */}
      <div
        {...panMoveProps}
        tabIndex={0}
        className={panAreaStyles()}
        style={{
          left: `calc(${leftPercent}% + ${PADDING}px + ${HANDLE_WIDTH}px)`,
          right: `calc(${rightPercent}% + ${PADDING}px + ${HANDLE_WIDTH}px)`,
        }}
        onDoubleClick={handleDoubleClick}
      />

      {/* Right resize handle */}
      <div
        {...rightHandleMoveProps}
        tabIndex={0}
        className="absolute inset-y-0 z-20 flex w-3 cursor-ew-resize items-center justify-center rounded-r-sm bg-blue-500 hover:bg-blue-600"
        style={{
          right: `calc(${rightPercent}% + ${PADDING}px)`,
        }}
      >
        <div className="h-4 w-0.5 rounded-full bg-white/70" />
      </div>
    </div>
  );
}
