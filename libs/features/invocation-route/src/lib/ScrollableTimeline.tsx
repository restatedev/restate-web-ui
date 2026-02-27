import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { CSSProperties, ReactNode, useEffect, useRef } from 'react';
import {
  UnitsPortalContent,
  ViewportSelectorPortalContent,
  ZoomControlsPortalContent,
} from './Portals';
import { ViewportSelector } from './ViewportSelector';
import { Units } from './Units';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useTimelineEngineContext } from './TimelineEngineContext';

const scrollableTimelineStyles = tv({
  base: 'overflow-hidden',
});

const zoomContainerStyles = tv({
  base: 'relative',
  variants: {
    animate: {
      true: 'transition-transform duration-300 ease-out',
      false: '',
    },
  },
});

const unitsContainerStyles = tv({
  base: 'relative h-full',
  variants: {
    animate: {
      true: 'transition-transform duration-300 ease-out',
      false: '',
    },
  },
});

export function ScrollableTimeline({
  className,
  style,
  children,
  dataUpdatedAt,
  cancelEvent,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  dataUpdatedAt: number;
  cancelEvent?: JournalEntryV2;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const engine = useTimelineEngineContext();

  const {
    coordinateStart,
    coordinateEnd,
    actualDuration,
    viewportStart,
    viewportEnd,
    viewportDuration,
    zoomLevel,
    offsetPercent,
    isFullTrace,
    mode,
    overviewStart,
    overviewEnd,
    setViewport,
    resetViewport,
    panViewport,
  } = engine;

  const stateRef = useRef({ viewportDuration });
  stateRef.current = { viewportDuration };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      const { viewportDuration: vd } = stateRef.current;
      e.preventDefault();

      let deltaX = e.deltaX;
      if (e.deltaMode === 1) deltaX *= 16;

      const timeDelta = (deltaX / container.clientWidth) * vd;
      panViewport(timeDelta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [panViewport]);

  const animate = mode !== 'inspect';

  return (
    <div
      ref={scrollRef}
      className={scrollableTimelineStyles({ className })}
      style={style}
    >
      <ZoomControlsPortalContent>
        <HoverTooltip content={isFullTrace ? 'Zoom' : 'Reset zoom'}>
          <Button
            variant="icon"
            onClick={() => {
              if (isFullTrace) {
                const traceEnd = coordinateStart + actualDuration;
                const vd = viewportEnd - viewportStart;
                if (vd > 0) {
                  const newDuration = vd / 2;
                  setViewport(
                    Math.max(coordinateStart, traceEnd - newDuration),
                    traceEnd,
                  );
                }
              } else {
                resetViewport();
              }
            }}
          >
            <Icon
              name={isFullTrace ? IconName.ZoomIn : IconName.ZoomOut}
              className="h-4 w-4"
            />
          </Button>
        </HoverTooltip>
      </ZoomControlsPortalContent>
      <ViewportSelectorPortalContent>
        <ViewportSelector
          className="absolute inset-0"
          start={overviewStart}
          end={overviewEnd}
          viewportStart={viewportStart}
          viewportEnd={viewportEnd}
          setViewport={setViewport}
          resetViewport={resetViewport}
        />
      </ViewportSelectorPortalContent>
      <UnitsPortalContent>
        <div
          className={unitsContainerStyles({ animate })}
          style={{
            width: `${zoomLevel * 100}%`,
            minWidth: `${zoomLevel * 100}%`,
            transform: `translateX(-${offsetPercent}%)`,
            willChange: 'transform',
          }}
        >
          <Units
            className="pointer-events-none absolute inset-0"
            start={coordinateStart}
            end={coordinateEnd}
            dataUpdatedAt={dataUpdatedAt}
            cancelEvent={cancelEvent}
          />
        </div>
      </UnitsPortalContent>
      <div
        className={zoomContainerStyles({ animate })}
        style={{
          width: `${zoomLevel * 100}%`,
          minWidth: `${zoomLevel * 100}%`,
          transform: `translateX(-${offsetPercent}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
