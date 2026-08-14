import { Badge } from '@restate/ui/badge';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'flex min-w-0 flex-row flex-wrap items-baseline gap-0.5',
    status:
      'relative inline-flex max-w-full gap-2 border-dashed border-zinc-400/60 bg-transparent',
    timing:
      'max-w-full truncate border-none bg-transparent py-0 text-2xs font-normal text-zinc-500/80',
    value: 'font-medium text-zinc-500/90',
  },
});

export interface ScheduledStatusProps {
  scheduledAt?: string;
  className?: string;
}

export function ScheduledStatus({
  scheduledAt,
  className,
}: ScheduledStatusProps) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const date = scheduledAt ? new Date(scheduledAt) : undefined;
  const timing =
    date && Number.isFinite(date.getTime())
      ? durationSinceLastSnapshot(date)
      : undefined;
  const duration = timing ? formatDurations(timing) : undefined;
  const { root, status, timing: timingStyle, value } = styles();

  return (
    <div className={root({ className })}>
      <Badge className={status()}>Scheduled</Badge>
      {date && timing && duration && (
        <Badge size="sm" className={timingStyle()}>
          <span className="truncate">
            {!timing.isPast && 'in '}
            <DateTooltip date={date} title="Scheduled to run at">
              <span className={value()}>
                {timing.isPast ? 'due now' : duration}
              </span>
            </DateTooltip>
          </span>
        </Badge>
      )}
    </div>
  );
}
