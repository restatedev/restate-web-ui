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
  LIVE_TRANSITION_DURATION_MS,
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
      true: 'transition-[transform,width,min-width] ease-linear',
      false: '',
    },
  },
});

const unitsContainerStyles = tv({
  base: 'relative h-full',
  variants: {
    animate: {
      true: 'transition-[transform,width,min-width] ease-linear',
      false: '',
    },
  },
});

function TimelineShading({
  start,
  end,
  nowMs,
  animate,
  cancelEvent,
  renderNowOverlay,
}: {
  start: number;
  end: number;
  nowMs: number;
  animate: boolean;
  cancelEvent?: JournalEntryV2;
  renderNowOverlay: boolean;
}) {
  const duration = Math.max(1, end - start);
  const clampedNowMs = Math.max(start, Math.min(nowMs, end));
  const nowPercent = Math.max(0, Math.min(100, ((clampedNowMs - start) / duration) * 100));
  const transitionDurationMs = LIVE_TRANSITION_DURATION_MS;

  return (
    <div className="pointer-events-none absolute top-[calc(-3rem-2px)] right-0 bottom-0 left-0 z-0">
      {cancelEvent && (
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 overflow-hidden px-2 transition-all duration-300">
          <div
            className="pointer-events-none h-full w-full rounded-br-2xl border-l-2 border-black/8 mix-blend-multiply transition-all duration-300 [background:repeating-linear-gradient(-45deg,--theme(--color-black/0.05),--theme(--color-black/0.05)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)_fixed]"
            style={{
              marginLeft: `calc(${
                ((new Date(String(cancelEvent.start)).getTime() - start) / duration) * 100
              }% - 1px)`,
            }}
          />
        </div>
      )}
      {renderNowOverlay && nowPercent < 100 && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 overflow-hidden rounded-r-2xl transition-[left] duration-300 linear"
          style={{
            left: `calc(${nowPercent}% - 0.5rem)`,
            transitionDuration: animate ? `${transitionDurationMs}ms` : undefined,
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-r-2xl mix-blend-screen [background:repeating-linear-gradient(-45deg,--theme(--color-white/.6),--theme(--color-white/.6)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)]" />
        </div>
      )}
    </div>
  );
}

export function ScrollableTimeline({
  className,
  style,
  children,
  cancelEvent,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  cancelEvent?: JournalEntryV2;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const engine = useTimelineEngineContext();

  const {
    mode,
    setViewport,
    resetViewport,
  } = engine;

  const { frame: renderFrame, nowMarker, zoomIn, resetZoom } =
    useTimelineViewportInteractions({
      engine,
      containerRef: scrollRef,
      zoomInFactor: 2,
    });

  const shouldPinNowMarker = nowMarker.pinToRightEdge;
  const transitionDurationMs = LIVE_TRANSITION_DURATION_MS;

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
            transitionDuration: animateTimeline
              ? `${transitionDurationMs}ms`
              : undefined,
            transitionTimingFunction: animateTimeline ? 'linear' : undefined,
            willChange: 'transform',
          }}
        >
          <Units
            className="pointer-events-none absolute inset-0"
            start={renderFrame.coordinateStart}
            end={renderFrame.coordinateEnd}
            nowMs={engine.nowMs}
            renderNowMarker={nowMarker.renderInTimeline}
            pinNowToRightEdge={shouldPinNowMarker}
          />
        </div>
        {shouldPinNowMarker && (
          <div className="pointer-events-none absolute top-[calc(3rem+2px)] right-0 bottom-0 z-20 w-0 border-l-2 border-white/80 font-sans text-2xs text-gray-500">
            <div className="pointer-events-none absolute z-4 mt-0.5 rounded-sm border border-white bg-zinc-500 px-1 text-2xs text-white left-px -translate-x-full">
              Now
            </div>
          </div>
        )}
      </UnitsPortalContent>
      <div
        className={zoomContainerStyles({ animate: animateTimeline })}
        style={{
          width: `${renderFrame.zoomLevel * 100}%`,
          minWidth: `${renderFrame.zoomLevel * 100}%`,
          transform: `translateX(-${renderFrame.offsetPercent}%)`,
          transitionDuration: animateTimeline
            ? `${transitionDurationMs}ms`
            : undefined,
          transitionTimingFunction: animateTimeline ? 'linear' : undefined,
        }}
      >
        <TimelineShading
          start={renderFrame.coordinateStart}
          end={renderFrame.coordinateEnd}
          nowMs={engine.nowMs}
          animate={animateTimeline}
          cancelEvent={cancelEvent}
          renderNowOverlay={nowMarker.renderInTimeline}
        />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
