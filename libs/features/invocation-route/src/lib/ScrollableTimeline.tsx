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
      false: 'overflow-x-auto overflow-y-hidden',
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
  const unitsContentRef = useRef<HTMLDivElement>(null);
  const unitsScrollLeftRef = useRef(0);

  const [viewport, setViewportState] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const scrollRafRef = useRef<number | null>(null);

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

  const traceDuration = end - start;
  const viewportDuration = viewportEnd - viewportStart;
  const zoomLevel =
    !isFullTrace && viewportDuration > 0 ? traceDuration / viewportDuration : 1;

  const stateRef = useRef({
    isFullTrace,
    start,
    traceDuration,
    viewportDuration,
  });
  stateRef.current = {
    isFullTrace,
    start,
    traceDuration,
    viewportDuration,
  };

  const syncUnitsScroll = useCallback((scrollLeft: number) => {
    if (unitsScrollLeftRef.current === scrollLeft) return;
    unitsScrollLeftRef.current = scrollLeft;

    const unitsContent = unitsContentRef.current;
    if (unitsContent) {
      unitsContent.style.transform = `translateX(${-scrollLeft}px)`;
    }
  }, []);

  const handleViewportChange = useCallback(
    (newViewportStart: number, newViewportEnd: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const { start: s, traceDuration: td } = stateRef.current;
      const newViewportDuration = newViewportEnd - newViewportStart;
      const scrollableWidth = container.scrollWidth - container.clientWidth;
      if (scrollableWidth <= 0) return;

      const scrollPercent = (newViewportStart - s) / (td - newViewportDuration);
      container.scrollLeft = scrollPercent * scrollableWidth;
      syncUnitsScroll(container.scrollLeft);
    },
    [syncUnitsScroll],
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;

      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        syncUnitsScroll(target.scrollLeft);

        const {
          isFullTrace: ift,
          start: s,
          traceDuration: td,
          viewportDuration: vd,
        } = stateRef.current;
        if (ift) return;

        const scrollableWidth = target.scrollWidth - target.clientWidth;
        if (scrollableWidth <= 0) return;

        const scrollPercent = target.scrollLeft / scrollableWidth;
        const newViewportStart = s + scrollPercent * (td - vd);
        const newViewportEnd = newViewportStart + vd;

        setViewport(newViewportStart, newViewportEnd);
      });
    },
    [setViewport, syncUnitsScroll],
  );

  useEffect(() => {
    syncUnitsScroll(scrollRef.current?.scrollLeft ?? 0);
  }, [zoomLevel, syncUnitsScroll]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className={scrollableTimelineStyles({ isFullTrace, className })}
      style={style}
      onScroll={handleScroll}
    >
      <ViewportSelectorPortalContent>
        <ViewportSelector
          className="absolute inset-0"
          start={start}
          end={end}
          viewportStart={viewportStart}
          viewportEnd={viewportEnd}
          setViewport={setViewport}
          onViewportChange={handleViewportChange}
        />
      </ViewportSelectorPortalContent>
      <UnitsPortalContent>
        <div
          ref={unitsContentRef}
          className="relative h-full"
          style={{
            width: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
            minWidth: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
            transform: 'translateX(0px)',
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
        }}
      >
        {children}
      </div>
    </div>
  );
}
