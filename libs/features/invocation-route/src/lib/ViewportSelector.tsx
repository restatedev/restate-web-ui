import { useCallback, useRef } from 'react';
import { useMove } from 'react-aria';
import { useJournalContext } from './JournalContext';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: '',
});

const panAreaStyles = tv({
  base: 'absolute inset-y-0 z-10 cursor-grab border-y-2 border-blue-500/40 bg-blue-500/5',
});

const MIN_VIEWPORT_DURATION = 100;
const HANDLE_WIDTH = 12;
const PADDING = 8;

export function ViewportSelector({ className }: { className?: string }) {
  const { start, end, viewportStart, viewportEnd, setViewport } =
    useJournalContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const traceDuration = end - start;

  const pixelToTime = useCallback(
    (deltaX: number) => {
      if (!containerRef.current || traceDuration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      return (deltaX / rect.width) * traceDuration;
    },
    [traceDuration],
  );

  const { moveProps: leftHandleMoveProps } = useMove({
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const newStart = Math.max(
        start,
        Math.min(
          viewportStart + deltaTime,
          viewportEnd - MIN_VIEWPORT_DURATION,
        ),
      );
      setViewport(newStart, viewportEnd);
    },
  });

  const { moveProps: rightHandleMoveProps } = useMove({
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const newEnd = Math.min(
        end,
        Math.max(
          viewportEnd + deltaTime,
          viewportStart + MIN_VIEWPORT_DURATION,
        ),
      );
      setViewport(viewportStart, newEnd);
    },
  });

  const { moveProps: panMoveProps } = useMove({
    onMove(e) {
      const deltaTime = pixelToTime(e.deltaX);
      const viewportDuration = viewportEnd - viewportStart;

      let newStart = viewportStart + deltaTime;
      let newEnd = viewportEnd + deltaTime;

      if (newStart < start) {
        newStart = start;
        newEnd = start + viewportDuration;
      }
      if (newEnd > end) {
        newEnd = end;
        newStart = end - viewportDuration;
      }

      setViewport(newStart, newEnd);
    },
  });

  const handleDoubleClick = useCallback(() => {
    setViewport(start, end);
  }, [start, end, setViewport]);

  if (traceDuration <= 0) return null;

  const leftPercent = ((viewportStart - start) / traceDuration) * 100;
  const widthPercent = ((viewportEnd - viewportStart) / traceDuration) * 100;
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
