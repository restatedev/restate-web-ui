import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { tv } from '@restate/util/styles';
import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { UnitsPortalContent, ViewportSelectorPortalContent } from './Portals';
import { ViewportSelector } from './ViewportSelector';
import { Units } from './Units';

const scrollableTimelineStyles = tv({
  base: '',
  variants: {
    isFullTrace: {
      true: '',
      false: 'overflow-hidden',
    },
  },
});

const VIEWPORT_EPSILON_MS = 1;

export function ScrollableTimeline({
  className,
  style,
  children,
  start,
  end,
  dataUpdatedAt,
  cancelEvent,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  start: number;
  end: number;
  dataUpdatedAt: number;
  cancelEvent?: JournalEntryV2;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewportState] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const isFullTrace =
    viewport === null || (viewport.start <= start && viewport.end >= end);
  const viewportStart = isFullTrace ? start : viewport.start;
  const viewportEnd = isFullTrace ? end : viewport.end;

  const setViewport = useCallback((newStart: number, newEnd: number) => {
    setViewportState((current) => {
      if (
        current &&
        Math.abs(current.start - newStart) < VIEWPORT_EPSILON_MS &&
        Math.abs(current.end - newEnd) < VIEWPORT_EPSILON_MS
      ) {
        return current;
      }
      return { start: newStart, end: newEnd };
    });
  }, []);

  const resetViewport = useCallback(() => {
    setViewportState(null);
  }, []);

  const traceDuration = end - start;
  const viewportDuration = viewportEnd - viewportStart;
  const zoomLevel =
    !isFullTrace && viewportDuration > 0 ? traceDuration / viewportDuration : 1;

  const offsetPercent = isFullTrace
    ? 0
    : ((viewportStart - start) / traceDuration) * 100;

  const stateRef = useRef({
    start,
    traceDuration,
    viewportDuration,
    viewportStart,
  });
  stateRef.current = {
    start,
    traceDuration,
    viewportDuration,
    viewportStart,
  };

  useEffect(() => {
    if (isFullTrace) return;
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();

      let deltaX = e.deltaX;
      if (e.deltaMode === 1) deltaX *= 16;

      const {
        start: s,
        traceDuration: td,
        viewportDuration: vd,
        viewportStart: vs,
      } = stateRef.current;
      const timeDelta = (deltaX / container.clientWidth) * vd;
      const newVS = Math.max(s, Math.min(s + td - vd, vs + timeDelta));
      setViewport(newVS, newVS + vd);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isFullTrace, setViewport]);

  return (
    <div
      ref={scrollRef}
      className={scrollableTimelineStyles({ isFullTrace, className })}
      style={style}
    >
      <ViewportSelectorPortalContent>
        <ViewportSelector
          className="absolute inset-0"
          start={start}
          end={end}
          viewportStart={viewportStart}
          viewportEnd={viewportEnd}
          setViewport={setViewport}
          resetViewport={resetViewport}
        />
      </ViewportSelectorPortalContent>
      <UnitsPortalContent>
        <div
          className="relative h-full"
          style={{
            width: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
            minWidth: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
            transform: `translateX(-${offsetPercent}%)`,
            willChange: 'transform',
          }}
        >
          <Units
            className="pointer-events-none absolute inset-0"
            start={start}
            end={end}
            dataUpdatedAt={dataUpdatedAt}
            cancelEvent={cancelEvent}
            viewportDuration={viewportDuration}
          />
        </div>
      </UnitsPortalContent>
      <div
        className="relative"
        style={{
          width: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
          minWidth: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
          transform: `translateX(-${offsetPercent}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
