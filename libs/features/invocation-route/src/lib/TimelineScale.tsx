import { CSSProperties, PropsWithChildren } from 'react';
import { useJournalTimelineContext } from '@restate/features-invocation-ui';
import { useTimelineEngineContext } from '@restate/ui-timeline-zoom';

const TIMELINE_SCALE_VAR = '--timeline-scale';
const DRAW_START_VAR = '--timeline-draw-start';
const DRAW_END_VAR = '--timeline-draw-end';
const ENTRY_START_VAR = '--timeline-entry-start';
const ENTRY_SPAN_VAR = '--timeline-entry-span';
const DRAW_WINDOW_MARGIN_VIEWPORTS = 2;
const UNCLAMPED_DRAW_WINDOW = { start: -1, end: 2 };

export function getTimelineScale({
  start,
  end,
  presentedEnd,
}: {
  start: number;
  end: number;
  presentedEnd: number;
}) {
  const duration = end - start;
  const presentedDuration = presentedEnd - start;
  return duration > 0 && presentedDuration > 0
    ? duration / presentedDuration
    : 1;
}

export function scaleTimelinePercent(fraction: number) {
  return `calc(${fraction * 100}% * var(${TIMELINE_SCALE_VAR}, 1))`;
}

export function scaleTimelinePercentFromEnd(fraction: number) {
  return `calc(100% - ${scaleTimelinePercent(fraction)})`;
}

export function getTimelineDrawWindow({
  zoomLevel,
  offsetPercent,
}: {
  zoomLevel: number;
  offsetPercent: number;
}) {
  if (
    !(zoomLevel > 1) ||
    !Number.isFinite(zoomLevel) ||
    !Number.isFinite(offsetPercent)
  ) {
    return UNCLAMPED_DRAW_WINDOW;
  }
  const viewport = 1 / zoomLevel;
  const firstViewport = Math.floor((offsetPercent / 100) * zoomLevel + 1e-9);
  return {
    start: (firstViewport - DRAW_WINDOW_MARGIN_VIEWPORTS) * viewport,
    end: (firstViewport + 2 + DRAW_WINDOW_MARGIN_VIEWPORTS) * viewport,
  };
}

export function timelineDrawWindowStyle({
  start,
  end,
}: {
  start: number;
  end: number;
}) {
  return { [DRAW_START_VAR]: start, [DRAW_END_VAR]: end } as CSSProperties;
}

const drawStart = `var(${DRAW_START_VAR}, ${UNCLAMPED_DRAW_WINDOW.start})`;
const drawEnd = `var(${DRAW_END_VAR}, ${UNCLAMPED_DRAW_WINDOW.end})`;

export const TIMELINE_DRAW_WINDOW_INSET: CSSProperties = {
  left: `max(0%, calc(${drawStart} * 100%))`,
  right: `max(0%, calc((1 - ${drawEnd}) * 100%))`,
};

export function timelineEntrySpanStyle(start: number, span: number) {
  return {
    [ENTRY_START_VAR]: start,
    [ENTRY_SPAN_VAR]: Math.max(span, Number.EPSILON),
  } as CSSProperties;
}

const entryStart = `var(${ENTRY_START_VAR}, 0) * var(${TIMELINE_SCALE_VAR}, 1)`;
const entrySpan = `var(${ENTRY_SPAN_VAR}, 1) * var(${TIMELINE_SCALE_VAR}, 1)`;

export const TIMELINE_ENTRY_DRAW_WINDOW_MARGINS: CSSProperties = {
  marginLeft: `max(0%, calc((${drawStart} - ${entryStart}) / (${entrySpan}) * 100%))`,
  marginRight: `max(0%, calc((${entryStart} + ${entrySpan} - ${drawEnd}) / (${entrySpan}) * 100%))`,
};

export function TimelineScale({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  const { start, end } = useJournalTimelineContext();
  const { coordinateEnd } = useTimelineEngineContext();
  const scale = getTimelineScale({ start, end, presentedEnd: coordinateEnd });

  return (
    <div
      className={className}
      style={{ [TIMELINE_SCALE_VAR]: scale } as CSSProperties}
    >
      {children}
    </div>
  );
}
