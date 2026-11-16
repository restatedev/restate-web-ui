import { CSSProperties, PropsWithChildren } from 'react';
import { useJournalTimelineContext } from '@restate/features-invocation-ui';
import { useTimelineEngineContext } from '@restate/ui-timeline-zoom';

const TIMELINE_SCALE_VAR = '--timeline-scale';

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
