import { OneWayCallJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { Failure } from '../Failure';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { DateTooltip } from '@restate/ui/tooltip';
import { useJournalContext } from '../JournalContext';
import { Entries } from '../Entries';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';

export function OneWayCall({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<OneWayCallJournalEntryType>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const invokeTime = entry.invokeTime ?? entry.start;
  const { isPast, ...parts } = invokeTime
    ? durationSinceLastSnapshot(invokeTime)
    : { isPast: undefined };
  const duration = invokeTime ? formatDurations(parts) : undefined;
  const { setInvocationIds, isPending, invocationIds } = useJournalContext();
  const isExpanded =
    entry.invoked_id && invocationIds.includes(entry.invoked_id) && !isPending;

  const invokedIsPending = isPending?.[String(entry.invoked_id)];

  return (
    <div className="flex flex-row gap-1.5 items-center pr-1.5 max-w-full relative">
      <Button
        onClick={() => {
          setInvocationIds?.((ids) => {
            if (entry.invoked_id && !ids.includes(entry.invoked_id)) {
              return [...ids, entry.invoked_id];
            } else {
              return ids.filter((id) => id !== entry.invoked_id);
            }
          });
        }}
        variant="icon"
        className="absolute right-[100%] z-20"
      >
        {invokedIsPending ? (
          <Spinner />
        ) : (
          <Icon
            name={isExpanded ? IconName.ChevronUp : IconName.ChevronDown}
            className="w-3.5 h-3.5"
          />
        )}
      </Button>
      <Target
        target={entry.invoked_target}
        className="[font-size:1.02em] [&>span_a_svg]:w-3.5 [&>*_a_svg]:h-3.5"
        showHandler={false}
      >
        <div className="max-w-full flex items-center">
          <Expression
            isHandler
            className="min-w-0"
            name={entry.invoked_target?.split('/').at(-1) ?? ''}
            output={
              entry.invoked_id && (
                <InvocationId
                  id={entry.invoked_id}
                  className="truncate max-w-[15ch] flex"
                  size="sm"
                />
              )
            }
            input={
              <>
                {entry.parameters && (
                  <InputOutput
                    name="parameters"
                    popoverTitle="Parameters"
                    popoverContent={
                      <Value
                        value={entry.parameters}
                        className="text-xs font-mono py-3"
                      />
                    }
                  />
                )}
                {entry.parameters &&
                  entry.headers &&
                  entry.headers.length > 0 &&
                  ', '}
                {entry.headers && entry.headers.length > 0 && (
                  <InputOutput
                    name="headers"
                    popoverTitle=""
                    className="px-0 bg-transparent border-none mx-2 [&&&]:mb-3"
                    popoverContent={<Headers headers={entry.headers} />}
                  />
                )}
              </>
            }
          />

          {error?.message && (
            <Failure
              message={error.message}
              restate_code={error.restate_code}
              isRetrying={isRetrying || wasRetrying}
            />
          )}
        </div>
      </Target>
      {duration && invokeTime && (
        <div className="inline-flex items-center gap-[0.5ch] truncate">
          <span className="font-normal text-zinc-500 truncate">scheduled </span>
          {!isPast && <span className="font-normal text-zinc-500">in </span>}
          <DateTooltip date={new Date(invokeTime)} title={'Call scheduled at'}>
            {duration}
          </DateTooltip>
          {isPast && <span className="font-normal text-zinc-500"> ago</span>}
        </div>
      )}
      {entry.invoked_id &&
        invocationIds.includes(entry.invoked_id) &&
        !invokedIsPending && (
          <Entries invocationId={entry.invoked_id} showInputEntry={false} />
        )}
    </div>
  );
}
