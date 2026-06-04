import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'min-w-0 shrink truncate font-sans text-2xs font-normal text-zinc-400',
});

// Subtle relative time for journal lifecycle/notification rows. The duration is
// measured against the API snapshot (`dataUpdatedAt`, via SnapshotTimeProvider)
// — same source StatusTimeline uses — and the DateTooltip exposes the exact
// local + UTC time on hover. Direction is derived from `isPast`: past events
// read "<duration> ago", future ones ("Next retry", upcoming "Scheduled to
// run") read "in <duration>". `connector` overrides the leading word for rows
// whose label doesn't already supply one (e.g. "Running" → "since").
export function RelativeTime({
  date,
  tooltipTitle,
  connector,
  className,
}: {
  date?: string;
  tooltipTitle: string;
  connector?: string;
  className?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  if (!date) {
    return null;
  }
  const parts = durationSinceLastSnapshot(date);
  const duration = formatDurations(parts);
  if (!duration) {
    return null;
  }
  const isPast = (parts as { isPast?: boolean }).isPast ?? true;
  const leading = connector ?? (isPast ? undefined : 'in');
  const trailing = isPast ? 'ago' : undefined;

  return (
    <span className={styles({ className })}>
      {leading ? `${leading} ` : ''}
      <DateTooltip date={new Date(date)} title={tooltipTitle}>
        <span className="font-medium text-zinc-500/90">{duration}</span>
      </DateTooltip>
      {trailing ? ` ${trailing}` : ''}
    </span>
  );
}
