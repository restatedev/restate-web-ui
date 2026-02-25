import { useCallback, useRef } from 'react';
import { useMove } from 'react-aria';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: '',
});

const panAreaStyles = tv({
  base: 'absolute inset-y-0 z-10 cursor-grab rounded-md shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_1px_3px_1px_rgba(96,165,250,0.08)] backdrop-brightness-110 backdrop-saturate-[1.1] transition-shadow duration-[140ms] ease-out hover:shadow-[0_0_0_1px_rgba(96,165,250,0.3),0_1px_5px_2px_rgba(96,165,250,0.1)] active:shadow-[0_0_0_1px_rgba(96,165,250,0.4),0_2px_6px_2px_rgba(96,165,250,0.12)]',
});

const MIN_VIEWPORT_DURATION = 100;
const MIN_VIEWPORT_WIDTH_PX = 40;
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
      onViewportChange?.(newStart, prev.end);
      setViewport(newStart, prev.end);
    },
    onMoveEnd() {
      const final = optimisticViewportRef.current;
      optimisticViewportRef.current = null;
      if (final) {
        onViewportChange?.(final.start, final.end);
        setViewport(final.start, final.end);
      }
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
      onViewportChange?.(prev.start, newEnd);
      setViewport(prev.start, newEnd);
    },
    onMoveEnd() {
      const final = optimisticViewportRef.current;
      optimisticViewportRef.current = null;
      if (final) {
        onViewportChange?.(final.start, final.end);
        setViewport(final.start, final.end);
      }
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
      onViewportChange?.(newStart, newEnd);
      setViewport(newStart, newEnd);
    },
    onMoveEnd() {
      const final = optimisticViewportRef.current;
      optimisticViewportRef.current = null;
      if (final) {
        onViewportChange?.(final.start, final.end);
        setViewport(final.start, final.end);
      }
    },
  });

  const handleDoubleClick = useCallback(() => {
    setViewport(start, end);
  }, [start, end, setViewport]);

  if (traceDuration <= 0) return null;

  const leftPercent = ((displayStart - start) / traceDuration) * 100;
  const widthPercent = ((displayEnd - displayStart) / traceDuration) * 100;
  const rightPercent = 100 - leftPercent - widthPercent;

  return (
    <div ref={containerRef} className={styles({ className })}>
      {leftPercent > 0.1 && (
        <div
          className="pointer-events-none absolute inset-y-0 rounded-l-md bg-gray-100/60"
          style={{
            left: 0,
            width: `calc(${leftPercent}% + ${PADDING}px)`,
          }}
        />
      )}
      {rightPercent > 0.1 && (
        <div
          className="pointer-events-none absolute inset-y-0 rounded-r-md bg-gray-100/60"
          style={{
            right: 0,
            width: `calc(${rightPercent}% + ${PADDING}px)`,
          }}
        />
      )}
      {/* Left resize handle */}
      <div
        {...leftHandleMoveProps}
        tabIndex={0}
        className="group absolute inset-y-0 z-20 flex w-3 translate-x-1 cursor-ew-resize items-center justify-center"
        style={{
          left: `calc(${leftPercent}%)`,
        }}
      >
        <div className="absolute top-0 left-0 h-full w-0.5 bg-blue-400/0 transition-colors duration-150 ease-out group-hover:bg-blue-400" />
      </div>

      {/* Selection box - for panning */}
      <div className="absolute inset-x-2 inset-y-0" />
      <div
        {...panMoveProps}
        tabIndex={0}
        className={panAreaStyles()}
        style={{
          left: `calc(${leftPercent}% + ${PADDING}px)`,
          right: `calc(${rightPercent}% + ${PADDING}px)`,
        }}
        onDoubleClick={handleDoubleClick}
      />

      {/* Right resize handle */}
      <div
        {...rightHandleMoveProps}
        tabIndex={0}
        className="group absolute inset-y-0 z-20 flex w-3 translate-x-1 cursor-ew-resize items-center justify-center"
        style={{
          right: `calc(${rightPercent}% + ${PADDING}px)`,
        }}
      >
        <div className="absolute top-0 right-0 h-full w-0.5 bg-blue-400/0 transition-colors duration-150 ease-out group-hover:bg-blue-400" />
      </div>
    </div>
  );
}
