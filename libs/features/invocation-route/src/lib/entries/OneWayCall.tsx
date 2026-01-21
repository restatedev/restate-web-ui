import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

const styles = tv({
  base: 'relative flex flex-auto flex-row items-center gap-1.5 pr-2',
});

export function OneWayCall({
  entry,
  invocation,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'OneWayCall'; category?: 'command' }>
>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const invokeTime = entry.invokeTime ?? entry.start;
  const { isPast, ...parts } = invokeTime
    ? durationSinceLastSnapshot(invokeTime)
    : { isPast: undefined };
  const duration = invokeTime ? formatDurations(parts) : undefined;

  return (
    <div className={styles({ className })}>
      <EntryExpression
        entry={entry}
        invocation={invocation}
        input={
          <Target
            showHandler={false}
            target={[entry.serviceName, entry.serviceKey, entry.handlerName]
              .filter((v) => typeof v === 'string')
              .join('/')}
            className="mx-0.5 h-6 basis-20 font-sans text-2xs not-italic **:data-target:h-6 [&_a]:my-0"
          />
        }
        chain={
          <Expression
            name={'.' + entry.handlerName}
            operationSymbol=""
            className="pr-0 [&>*>*>*]:flex-auto"
            input={
              <>
                <LazyJournalEntryPayload.Parameters
                  invocationId={invocation?.id}
                  entry={entry}
                  title="Parameters"
                  isBase64
                />
                <LazyJournalEntryPayload.Headers
                  invocationId={invocation?.id}
                  entry={entry}
                  title="Headers"
                />
              </>
            }
          />
        }
        className="min-w-0"
      />
      {entry.invocationId && (
        <InvocationId id={entry.invocationId} className="-ml-1" size="icon" />
      )}
      {duration && invokeTime && !isPast && (
        <div className="ml-auto inline-flex items-center gap-[0.5ch] truncate font-sans text-xs">
          {!isPast && <span className="font-normal text-zinc-500">in </span>}
          <DateTooltip date={new Date(invokeTime)} title={'Call scheduled at'}>
            {duration}
          </DateTooltip>
          {isPast && <span className="font-normal text-zinc-500"> ago</span>}
        </div>
      )}
    </div>
  );
}
