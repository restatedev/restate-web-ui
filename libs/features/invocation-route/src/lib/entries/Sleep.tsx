import { SleepJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { Ellipsis } from '@restate/ui/loading';
import { Failure } from '../Failure';

export function Sleep({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<SleepJournalEntryType>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const { isPast, ...parts } = durationSinceLastSnapshot(entry.sleep_wakeup_at);
  const duration = formatDurations(parts);

  const entryError = entry.failure || error;

  return (
    <>
      <span className="font-normal text-zinc-500">
        {isPast ? 'Woke up from sleep ' : 'Wakes up from sleep in '}
      </span>
      {entry.sleep_wakeup_at && (
        <DateTooltip
          date={new Date(entry.sleep_wakeup_at)}
          title={isPast ? 'Woke up from sleep at' : 'Wakes up from sleep at'}
        >
          {duration}
        </DateTooltip>
      )}
      {!entry.completed && (!failed || isRetrying) && <Ellipsis />}
      <span className="font-normal text-zinc-500">{isPast && ' ago'}</span>
      {entryError?.message && (
        <Failure
          message={entryError.message}
          restate_code={entryError.restate_code}
          isRetrying={isRetrying || wasRetrying}
        />
      )}
    </>
  );
}
