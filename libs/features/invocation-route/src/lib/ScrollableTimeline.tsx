import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { CSSProperties, ReactNode, useRef } from 'react';
import {
  UnitsPortalContent,
  ViewportSelectorPortalContent,
  ZoomControlsPortalContent,
} from './Portals';
import { ViewportSelector } from './ViewportSelector';
import { Units } from './Units';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  useTimelineEngineContext,
  useTimelineViewportInteractions,
} from '@restate/ui/timeline-zoom';
import { HoverTooltip } from '@restate/ui/tooltip';

const scrollableTimelineStyles = tv({
  base: 'overflow-hidden',
});

const zoomContainerStyles = tv({
  base: 'relative',
  variants: {
    animate: {
      true: 'transition-[transform,width,min-width] duration-300 ease-out',
      false: '',
    },
  },
});

const unitsContainerStyles = tv({
  base: 'relative h-full',
  variants: {
    animate: {
      true: 'transition-[transform,width,min-width] duration-300 ease-out',
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
    mode,
    setViewport,
    resetViewport,
  } = engine;

  const { frame: renderFrame, zoomIn, resetZoom } =
    useTimelineViewportInteractions({
      engine,
      containerRef: scrollRef,
      zoomInFactor: 2,
    });

  const animateSelector = mode !== 'static';
  const animateTimeline = mode === 'live-follow';

  return (
    <div
      ref={scrollRef}
      className={scrollableTimelineStyles({ className })}
      style={style}
    >
      <ZoomControlsPortalContent>
        <div className="flex items-center gap-1">
          <HoverTooltip content="Reset zoom (full trace)">
            <Button variant="icon" onClick={resetZoom}>
              <Icon name={IconName.ZoomOut} className="h-4 w-4" />
            </Button>
          </HoverTooltip>
          <HoverTooltip content="Zoom in (2x)">
            <Button variant="icon" onClick={zoomIn}>
              <Icon name={IconName.ZoomIn} className="h-4 w-4" />
            </Button>
          </HoverTooltip>
        </div>
      </ZoomControlsPortalContent>
      <ViewportSelectorPortalContent>
        <ViewportSelector
          className="absolute inset-0"
          start={renderFrame.overviewStart}
          end={renderFrame.overviewEnd}
          viewportStart={renderFrame.viewportStart}
          viewportEnd={renderFrame.viewportEnd}
          animate={animateSelector}
          setViewport={setViewport}
          resetViewport={resetViewport}
        />
      </ViewportSelectorPortalContent>
      <UnitsPortalContent>
        <div
          className={unitsContainerStyles({ animate: animateTimeline })}
          style={{
            width: `${renderFrame.zoomLevel * 100}%`,
            minWidth: `${renderFrame.zoomLevel * 100}%`,
            transform: `translateX(-${renderFrame.offsetPercent}%)`,
            willChange: 'transform',
          }}
        >
          <Units
            className="pointer-events-none absolute inset-0"
            start={renderFrame.coordinateStart}
            end={renderFrame.coordinateEnd}
            dataUpdatedAt={dataUpdatedAt}
            cancelEvent={cancelEvent}
          />
        </div>
      </UnitsPortalContent>
      <div
        className={zoomContainerStyles({ animate: animateTimeline })}
        style={{
          width: `${renderFrame.zoomLevel * 100}%`,
          minWidth: `${renderFrame.zoomLevel * 100}%`,
          transform: `translateX(-${renderFrame.offsetPercent}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
