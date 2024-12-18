import { SleepJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Handler';
import { Value } from '../Value';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';

export function Sleep({
  entry,
  failed,
  invocation,
}: EntryProps<SleepJournalEntryType>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const { isPast, ...parts } = durationSinceLastSnapshot(entry.sleep_wakeup_at);
  const duration = formatDurations(parts);
  return (
    <>
      <span className="font-normal text-zinc-500">
        {isPast ? 'Woke up ' : 'Wakes up in '}
      </span>
      <DateTooltip
        date={new Date(entry.sleep_wakeup_at)}
        title={isPast ? 'Woke up at' : 'Wakes up at'}
      >
        {duration}
      </DateTooltip>
      <span className="font-normal text-zinc-500">{isPast && ' ago'}</span>
    </>
  );
}
