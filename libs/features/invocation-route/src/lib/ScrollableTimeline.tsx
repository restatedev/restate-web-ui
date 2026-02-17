import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { tv } from '@restate/util/styles';
import {
  CSSProperties,
  ReactNode,
  UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  UnitsPortalContent,
  usePortals,
  ViewportSelectorPortalContent,
} from './Portals';
import { ViewportSelector } from './ViewportSelector';
import { Units } from './Units';

const UNITS_PORTAL_ID = 'units-portal';

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
  const { getPortal: getUnitsPortal } = usePortals(UNITS_PORTAL_ID);

  const [viewport, setViewportState] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollContainerRef = useRef<HTMLDivElement | null>(null);

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

  const syncUnitsScroll = useCallback(
    (scrollLeft: number) => {
      const unitsContainer = getUnitsPortal?.();
      if (!unitsContainer) return;
      if (unitsContainer.scrollLeft === scrollLeft) return;
      unitsContainer.scrollLeft = scrollLeft;
    },
    [getUnitsPortal],
  );

  const handleViewportChange = useCallback(
    (newViewportStart: number, newViewportEnd: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const newViewportDuration = newViewportEnd - newViewportStart;
      const scrollableWidth = container.scrollWidth - container.clientWidth;
      if (scrollableWidth <= 0) return;

      const scrollPercent =
        (newViewportStart - start) / (traceDuration - newViewportDuration);
      container.scrollLeft = scrollPercent * scrollableWidth;
      syncUnitsScroll(container.scrollLeft);
    },
    [start, traceDuration, syncUnitsScroll],
  );

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      pendingScrollContainerRef.current = e.currentTarget;
      if (scrollRafRef.current !== null) {
        return;
      }

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const container = pendingScrollContainerRef.current;
        pendingScrollContainerRef.current = null;
        if (!container) return;

        syncUnitsScroll(container.scrollLeft);
        if (isFullTrace) return;

        const scrollableWidth = container.scrollWidth - container.clientWidth;
        if (scrollableWidth <= 0) return;

        const scrollPercent = container.scrollLeft / scrollableWidth;
        const newViewportStart =
          start + scrollPercent * (traceDuration - viewportDuration);
        const newViewportEnd = newViewportStart + viewportDuration;

        setViewport(newViewportStart, newViewportEnd);
      });
    },
    [
      isFullTrace,
      setViewport,
      start,
      syncUnitsScroll,
      traceDuration,
      viewportDuration,
    ],
  );

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    syncUnitsScroll(scrollRef.current?.scrollLeft ?? 0);
  }, [syncUnitsScroll, zoomLevel]);

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
        <Units
          className="pointer-events-none h-full"
          style={{
            width: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
            minWidth: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
          }}
          start={start}
          end={end}
          dataUpdatedAt={dataUpdatedAt}
          cancelEvent={cancelEvent}
        />
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
