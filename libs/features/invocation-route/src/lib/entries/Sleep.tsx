import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { EntryExpression } from './EntryExpression';

export function Sleep({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'command' }>
>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(entry.wakeupAt);
  const duration = formatDurations(parts);

  const entryError = entry.error;

  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        { paramName: 'name', title: 'Name', placeholderLabel: 'name' },
      ]}
      output={
        <div className="inline-flex items-center truncate min-w-0 font-sans text-xs">
          <span className="font-normal text-zinc-500 mr-[0.5ch] min-w-0 truncate">
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
          <span className="font-normal text-zinc-500 ml-[0.5ch]">
            {isPast && ' ago'}
          </span>
        </div>
      }
    />
  );
}
