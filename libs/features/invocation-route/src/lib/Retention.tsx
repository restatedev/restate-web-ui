import { Invocation } from '@restate/data-access/admin-api';
import { RetentionExplainer } from '@restate/features/explainers';
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
  base: 'w-full border-none bg-transparent pl-0 text-2xs font-normal text-zinc-500/80',
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
  const durationValue =
    type === 'completion'
      ? invocation?.completion_retention
      : invocation?.journal_retention;
  if (typeof durationValue !== 'string' || !invocation) {
    return null;
  }

  const durationObject = normaliseDuration(parseISODuration(durationValue));
  const isDurationZero =
    Array.from(Object.values(durationObject)).reduce((p, c) => p + c, 0) === 0;

  if (invocation?.completed_at) {
    const date = addDurationToDate(invocation?.completed_at, durationObject);
    const { isPast, ...parts } = durationSinceLastSnapshot(date);
    const duration = formatDurations(parts);

    return (
      <Badge className={styles({ className })}>
        <span className="w-full truncate">
          <span className="">
            {prefixForCompletion}
            {isPast ? 'ended' : 'ends'} {!isPast && 'in '}
          </span>
          {isDurationZero ? (
            <span>at completion</span>
          ) : (
            <>
              <DateTooltip
                date={date}
                className="value font-medium text-zinc-500/90"
                title={`${type === 'completion' ? 'Completion' : 'Journal'} retained until`}
              >
                {duration}
              </DateTooltip>
              <span className="">{isPast && ' ago'}</span>
            </>
          )}
          <RetentionExplainer
            variant="indicator-button"
            className="ml-1 align-middle"
          />
        </span>
      </Badge>
    );
  } else {
    return (
      <Badge className={styles({ className })}>
        <span className="w-full truncate">
          <span className="">{prefixForInProgress}for </span>
          <span className="value font-medium text-zinc-500/90">
            {formatDurations(durationObject)}{' '}
          </span>
          <span className="">
            after completion {isDurationZero ? '(no retention)' : ''}
          </span>
          <RetentionExplainer
            variant="indicator-button"
            className="ml-0 -translate-y-px align-middle"
          />
        </span>
      </Badge>
    );
  }
}
