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

export function OneWayCall({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
}: EntryProps<OneWayCallJournalEntryType>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const { isPast, ...parts } = entry.invokeTime
    ? durationSinceLastSnapshot(entry.invokeTime)
    : { isPast: undefined };
  const duration = entry.invokeTime ? formatDurations(parts) : undefined;

  return (
    <div className="flex flex-col gap-1.5 py-1.5 items-start pr-1.5 max-w-full relative">
      <div className="absolute w-2.5 border-l border-b  border-black/20 border-dashed left-3.5 top-6 h-5  rounded-b rounded-br-none" />
      <div className="absolute w-2.5 border-l border-b  border-black/20 border-dashed left-8 top-12 h-5  rounded-b rounded-br-none" />
      <Target
        target={entry.invoked_target}
        className="[font-size:inherit] [&_a_svg]:w-3 [&_a_svg]:h-3"
        showHandler={false}
      />
      <div className="pl-7 max-w-full flex items-center flex-wrap">
        <Expression
          isHandler
          name={entry.invoked_target?.split('/').at(-1) ?? ''}
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
        {duration && entry.invokeTime && (
          <>
            {!isPast && (
              <span className="font-normal text-zinc-500 mr-[1ch]">in </span>
            )}
            <DateTooltip date={new Date(entry.invokeTime)} title={'Call at'}>
              {duration}
            </DateTooltip>
            {isPast && (
              <span className="font-normal text-zinc-500 ml-[1ch]"> ago</span>
            )}
          </>
        )}
        {error?.message && (
          <Failure
            message={error.message}
            restate_code={error.restate_code}
            isRetrying={isRetrying}
          />
        )}
      </div>
      {entry.invoked_id && (
        <InvocationId
          id={entry.invoked_id}
          className="max-w-full pl-10 mt-0.5"
          size="sm"
        />
      )}
    </div>
  );
}
