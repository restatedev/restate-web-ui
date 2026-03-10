import { tv } from '@restate/util/styles';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import {
  LIVE_TRANSITION_DURATION_MS,
  useTimelineEngineContext,
  useTimelineIntervalSlots,
} from '@restate/ui/timeline-zoom';
import { DateTooltip } from '@restate/ui/tooltip';
import { CSSProperties } from 'react';

const intervalBoundaryStyles = tv({
  base: 'pointer-events-none absolute inset-y-0 right-0 border-r border-dotted border-black/10',
});

const intervalLabelStyles = tv({
  base: 'pointer-events-none absolute top-0 right-0 pt-0 pr-0.5 text-right font-sans text-2xs whitespace-nowrap text-gray-500',
});

const tickContainerStyles = tv({
  base: 'pointer-events-none relative mt-[calc(3rem+2px)] h-[calc(100%-3rem-2px)] w-full overflow-hidden rounded-r-2xl',
});

const intervalRowStyles = tv({
  base: 'pointer-events-none absolute inset-y-0 left-2 right-0 z-10 flex flex-nowrap overflow-hidden',
});

const spacerStyles = tv({
  base: 'h-full flex-shrink-0',
  variants: {
    animateWidth: {
      true: 'transition-[width] duration-300 linear',
      false: '',
    },
  },
});

const intervalSlotStyles = tv({
  base: 'pointer-events-none relative h-full flex-shrink-0 overflow-hidden',
  variants: {
    animateWidth: {
      true: 'transition-[width] duration-300 linear',
      false: '',
    },
  },
});

const intervalBackgroundStyles = tv({
  base: 'pointer-events-none absolute inset-0',
  variants: {
    isEven: {
      true: 'bg-gray-400/5',
      false: '',
    },
  },
});

const startDateTimeStyles = tv({
  base: 'pointer-events-none relative h-full',
});

const nowLabelStyles = tv({
  base: 'pointer-events-none absolute z-4 mt-0.5 rounded-sm border border-white bg-zinc-500 px-1 text-2xs text-white',
  variants: {
    side: {
      right: 'left-px',
      left: 'left-px -translate-x-full',
    },
  },
});

const nowMarkerStyles = tv({
  base: 'pointer-events-none absolute top-[calc(3rem+2px)] bottom-0 z-20 w-0 border-l-2 border-white/80 font-sans text-2xs text-gray-500',
  variants: {
    animateLeft: {
      true: 'transition-[left] duration-300 linear',
      false: '',
    },
  },
});

export function Units({
  className,
  style,
  start,
  end,
  nowMs,
  renderNowMarker = true,
  pinNowToRightEdge = false,
}: {
  className?: string;
  style?: CSSProperties;
  start: number;
  end: number;
  nowMs: number;
  renderNowMarker?: boolean;
  pinNowToRightEdge?: boolean;
}) {
  const duration = end - start;
  const safeDuration = Math.max(1, duration);
  const engine = useTimelineEngineContext();
  const transitionDurationMs = LIVE_TRANSITION_DURATION_MS;

  const relViewportLeft = engine.viewportStart - start;
  const relViewportRight = engine.viewportEnd - start;
  const {
    mergeTransition,
    segments,
    leadingSpacerPercent,
    shouldAnimateSlotWidth,
  } = useTimelineIntervalSlots({
    durationMs: duration,
    viewportStartOffsetMs: relViewportLeft,
    viewportEndOffsetMs: relViewportRight,
    targetIntervalMs: engine.tickInterval,
    mode: engine.mode,
    transitionDurationMs,
  });

  const clampedNowMs = Math.max(start, Math.min(nowMs, end));
  const nowRelativeMs = Math.max(0, clampedNowMs - start);
  const rawNowPercent = Math.max(
    0,
    Math.min(100, (nowRelativeMs / safeDuration) * 100),
  );
  const nowPercent = pinNowToRightEdge ? 100 : rawNowPercent;
  const shouldShowNow =
    renderNowMarker && engine.mode !== 'static' && clampedNowMs <= end;
  const shouldAnimateNowPosition = shouldShowNow && !pinNowToRightEdge;
  const nowLabelSide =
    clampedNowMs > (engine.viewportStart + engine.viewportEnd) / 2
      ? 'left'
      : 'right';

  return (
    <div className={className} style={style}>
      <div className="pointer-events-none absolute top-0 bottom-0 left-2 border-l border-dashed border-gray-500/40" />
      {shouldShowNow && (
        <div
          style={{
            left: `calc(${nowPercent}% - 2px - 0.5rem)`,
            transitionDuration: shouldAnimateNowPosition
              ? `${transitionDurationMs}ms`
              : undefined,
          }}
          className={nowMarkerStyles({ animateLeft: shouldAnimateNowPosition })}
        >
          <div className={nowLabelStyles({ side: nowLabelSide })}>Now</div>
        </div>
      )}
      <div className="h-full">
        <div className={tickContainerStyles()}>
          <div className={intervalRowStyles()}>
            {leadingSpacerPercent > 0 && (
              <div
                className={spacerStyles({ animateWidth: shouldAnimateSlotWidth })}
                style={{
                  width: `${leadingSpacerPercent}%`,
                  transitionDuration: shouldAnimateSlotWidth
                    ? `${transitionDurationMs}ms`
                    : undefined,
                }}
              />
            )}
            {segments.map((segment, segmentIndex) => {
              const previousSegment =
                segmentIndex > 0 ? segments[segmentIndex - 1] : undefined;
              const leftSiblingWidth =
                previousSegment &&
                previousSegment.gridIndex === segment.gridIndex - 1
                  ? previousSegment.widthPercent
                  : 0;
              const isLeftSlot = segment.gridIndex % 2 === 0;
              const displayWidthPercent =
                mergeTransition === null
                  ? segment.widthPercent
                  : mergeTransition.phase === 'collapse'
                    ? isLeftSlot
                      ? 0
                      : segment.widthPercent + leftSiblingWidth
                    : segment.widthPercent;
              const displayIsEven =
                mergeTransition === null ? segment.isEven : segment.mergedIsEven;
              const shouldShowBoundary =
                mergeTransition === null || !isLeftSlot;
              const shouldShowLabel =
                segment.labelBoundaryMs !== null &&
                (mergeTransition === null || !isLeftSlot);
              const labelBoundaryMs = segment.labelBoundaryMs;

              return (
                <div
                  key={segment.key}
                  className={intervalSlotStyles({
                    animateWidth: shouldAnimateSlotWidth,
                  })}
                  style={{
                    width: `${displayWidthPercent}%`,
                    transitionDuration: shouldAnimateSlotWidth
                      ? `${transitionDurationMs}ms`
                      : undefined,
                    transformOrigin: isLeftSlot ? 'left center' : 'right center',
                  }}
                >
                  <div
                    className={intervalBackgroundStyles({
                      isEven: displayIsEven,
                    })}
                  />
                  {shouldShowBoundary && <div className={intervalBoundaryStyles()} />}
                  {shouldShowLabel && labelBoundaryMs !== null && (
                    <div className={intervalLabelStyles()}>
                      +{formatDurations(getDuration(labelBoundaryMs))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-y-0 left-0 w-2" />
          <div className="absolute inset-y-0 right-0 w-2" />
        </div>
      </div>
    </div>
  );
}

export function StartDateTimeUnit({
  className,
  start,
}: {
  className?: string;
  start: number;
}) {
  return (
    <div className={startDateTimeStyles({ className })}>
      <div className="absolute -top-8 bottom-0 left-2 border-l border-dashed border-gray-500/40 font-sans text-2xs text-gray-500">
        <div className="pointer-events-auto ml-1 flex w-28 -translate-y-1 flex-col justify-start text-left">
          <DateTooltip date={new Date(start)} title="">
            {new Date(start).toLocaleDateString('en', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </DateTooltip>
          <DateTooltip date={new Date(start)} title="">
            {new Date(start).toLocaleTimeString('en', {
              timeZoneName: 'short',
            })}
          </DateTooltip>
        </div>
      </div>
    </div>
  );
}
