import { SleepJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { Ellipsis } from '@restate/ui/loading';
import { Failure } from '../Failure';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';

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
    <Expression
      name={'sleep'}
      prefix="async"
      className="pr-0"
      {...(typeof entry.name === 'string' &&
        entry.name && {
          input: (
            <InputOutput
              name={JSON.stringify(entry.name)}
              popoverTitle="Name"
              popoverContent={
                <Value value={entry.name} className="text-xs font-mono py-3" />
              }
            />
          ),
        })}
      output={
        <div className="inline-flex items-center truncate">
          <div className="inline-flex items-center truncate min-w-0">
            <span className="font-normal text-zinc-500 mr-[0.5ch] min-w-0 truncate">
              {isPast ? 'Woke up from sleep ' : 'Wakes up from sleep in '}
            </span>
            {entry.sleep_wakeup_at && (
              <DateTooltip
                date={new Date(entry.sleep_wakeup_at)}
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
          {!entry.completed && (!entryError || isRetrying) && <Ellipsis />}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restate_code}
              isRetrying={isRetrying || wasRetrying}
              className="-mr-1.5"
            />
          )}
        </div>
      }
    />
  );
}
