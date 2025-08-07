import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { EntryExpression } from './EntryExpression';

export function Sleep({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'command' }>
>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(entry.wakeupAt);
  const duration = formatDurations(parts);

  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'name',
          title: 'Name',
          placeholderLabel: 'name',
          shouldStringified: true,
        },
      ]}
      output={
        <div className="inline-flex min-w-0 items-center truncate font-sans text-xs">
          <span className="mr-[0.5ch] min-w-0 truncate font-normal text-zinc-500">
            {isPast ? 'Woke up ' : 'Wakes up in '}
          </span>
          {entry.wakeupAt && (
            <DateTooltip
              date={new Date(entry.wakeupAt)}
              title={
                isPast ? 'Woke up from sleep at' : 'Wakes up from sleep at'
              }
            >
              {' '}
              {duration}
            </DateTooltip>
          )}
          <span className="ml-[0.5ch] font-normal text-zinc-500">
            {isPast && ' ago'}
          </span>
        </div>
      }
    />
  );
}
