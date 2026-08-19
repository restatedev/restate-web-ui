import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { DateTooltip } from './DateTooltip';

const styles = tv({
  base: 'text-xs text-zinc-600 tabular-nums',
});

export function RelativeDate({
  date,
  title,
  className,
  showAgo = true,
  tooltipClassName,
}: {
  date: string;
  title: string;
  className?: string;
  showAgo?: boolean;
  tooltipClassName?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(date));
  return (
    <DateTooltip
      date={new Date(date)}
      title={title}
      className={tooltipClassName}
    >
      <time
        dateTime={date}
        aria-label={showAgo ? undefined : `${duration} ago`}
        className={styles({ className })}
      >
        {duration}
        {showAgo && ' ago'}
      </time>
    </DateTooltip>
  );
}
