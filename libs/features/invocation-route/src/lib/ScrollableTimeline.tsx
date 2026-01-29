import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { tv } from '@restate/util/styles';
import {
  CSSProperties,
  ReactNode,
  useCallback,
  useRef,
  useState,
  UIEvent,
} from 'react';
import { ViewportSelectorPortalContent } from './Portals';
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
    setViewportState({ start: newStart, end: newEnd });
  }, []);

  const traceDuration = end - start;
  const viewportDuration = viewportEnd - viewportStart;
  const zoomLevel =
    !isFullTrace && viewportDuration > 0 ? traceDuration / viewportDuration : 1;

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
    },
    [start, traceDuration],
  );

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    if (isFullTrace) return;

    const container = e.currentTarget;
    const scrollableWidth = container.scrollWidth - container.clientWidth;
    if (scrollableWidth <= 0) return;

    const scrollPercent = container.scrollLeft / scrollableWidth;
    const newViewportStart =
      start + scrollPercent * (traceDuration - viewportDuration);
    const newViewportEnd = newViewportStart + viewportDuration;

    setViewport(newViewportStart, newViewportEnd);
  }

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
      <div
        className="relative"
        style={{
          width: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
          minWidth: isFullTrace ? '100%' : `${zoomLevel * 100}%`,
        }}
      >
        <Units
          className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
          start={start}
          end={end}
          dataUpdatedAt={dataUpdatedAt}
          cancelEvent={cancelEvent}
        />
        {children}
      </div>
    </div>
  );
}
