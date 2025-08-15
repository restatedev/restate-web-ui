import { Invocation } from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { DateTooltip } from '@restate/ui/tooltip';
import {
  addDurationToDate,
  formatDurations,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'w-full border-none bg-transparent pl-0 text-zinc-500/80',
});
export function Retention({
  invocation,
  type,
  prefixForInProgress = '',
  prefixForCompletion = '',
  className,
}: {
  invocation?: Invocation;
  type: 'completion' | 'journal';
  prefixForInProgress?: string;
  prefixForCompletion?: string;
  className?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const isInvocationCompleted = Boolean(invocation?.completed_at);
  const durationValue =
    type === 'completion'
      ? invocation?.completion_retention
      : invocation?.journal_retention;
  if (typeof durationValue !== 'string' || !invocation) {
    return null;
  }

  const durationObject = normaliseDuration(parseISODuration(durationValue));
  if (isInvocationCompleted) {
    const date = addDurationToDate(invocation?.completed_at!, durationObject);
    const { isPast, ...parts } = durationSinceLastSnapshot(date);
    const duration = formatDurations(parts);

    return (
      <Badge className={styles({ className })}>
        <span className="w-full truncate">
          <span className="font-normal">
            {prefixForCompletion}ends {!isPast && 'in '}
          </span>
          <DateTooltip
            date={date}
            className="text-zinc-500/90"
            title={`${type === 'completion' ? 'Completion' : 'Journal'} retained until`}
          >
            {duration}
          </DateTooltip>
          <span className="font-normal">{isPast && ' ago'}</span>
        </span>
      </Badge>
    );
  } else {
    return (
      <Badge className={styles({ className })}>
        <span className="w-full truncate">
          <span className="font-normal">{prefixForInProgress}for </span>
          <span className="text-zinc-500/90">
            {formatDurations(durationObject)}{' '}
          </span>
          <span className="font-normal">after completion</span>
        </span>
      </Badge>
    );
  }
}
