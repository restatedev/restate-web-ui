import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { tv } from '@restate/util/styles';
import { EntryProgress, EntryProgressContainer } from './EntryProgress';
import { useJournalContext } from './JournalContext';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DateTooltip } from '@restate/ui/tooltip';

function unitInterval(duration: number) {
  const niceIntervals = [
    5, // 5 ms
    10, // 10 ms
    25, // 25 ms
    50, // 50 ms
    100, // 100 ms
    500, // 500 ms
    1000, // 1 second
    2000, // 2 seconds
    5000, // 5 seconds
    10_000, // 10 seconds
    15_000, // 15 seconds
    30_000, // 30 seconds
    60_000, // 1 minute
    2 * 60_000, // 2 minutes
    5 * 60_000, // 5 minutes
    10 * 60_000, // 10 minutes
    15 * 60_000, // 15 minutes
    30 * 60_000, // 30 minutes
    60 * 60_000, // 1 hour
    2 * 60 * 60_000, // 2 hours
    6 * 60 * 60_000, // 6 hours
    12 * 60 * 60_000, // 12 hours
    24 * 60 * 60_000, // 1 day
    2 * 24 * 60 * 60_000, // 2 days
    7 * 24 * 60 * 60_000, // 1 week
  ];

  const idealTicks = 4;
  const idealInterval = duration / idealTicks;

  const matchedIntervalIndex = niceIntervals.findIndex(
    (interval) => interval >= idealInterval,
  );

  if (matchedIntervalIndex === -1) {
    return Math.ceil(idealInterval);
  }
  const matchedInterval = niceIntervals.at(matchedIntervalIndex) as number;

  if (Math.ceil(duration / matchedInterval) >= 3) {
    return niceIntervals.at(matchedIntervalIndex) as number;
  } else if (
    matchedIntervalIndex >= 1 &&
    Math.ceil(duration / Number(niceIntervals.at(matchedIntervalIndex - 1))) < 6
  ) {
    return niceIntervals.at(matchedIntervalIndex - 1) as number;
  } else {
    return Math.ceil(idealInterval);
  }
}

const styles = tv({
  base: 'relative flex flex-col items-center rounded-2xl rounded-sm rounded-t-2xl rounded-l-none border-black/10 shadow-xs',
});
export function LifeCycleProgress({
  className,
  invocation,
}: {
  className?: string;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}) {
  const createdEvent = invocation?.journal?.entries?.find(
    (entry) => entry.category === 'event' && entry.type === 'Created',
  );

  const lifeCycleEntries = invocation?.journal?.entries?.filter(
    (entry) =>
      (entry.category === 'event' &&
        [
          'Created',
          'Running',
          'Pending',
          'Scheduled',
          'Suspended',
          'Retrying',
        ].includes(String(entry.type))) ||
      (entry.category === 'notification' && entry.type === 'Cancel'),
  );

  return (
    <div className={styles({ className })}>
      <div className="relative mt-4 h-6 w-full">
        {createdEvent && (
          <EntryProgressContainer
            className="absolute top-1"
            entry={createdEvent}
            invocation={invocation}
          >
            <div className="h-6 w-full rounded-md" />
          </EntryProgressContainer>
        )}

        {lifeCycleEntries?.map((entry, i) => (
          <div
            className="absolute inset-0 top-2"
            date-entry-type={entry.type}
            key={entry.type + String(entry.start)}
          >
            <EntryProgress
              invocation={invocation}
              entry={entry}
              showDuration={false}
              className="*:h-3.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const unitsStyles = tv({
  base: 'transition-all duration-1000',
});
export function Units({
  className,
  invocation,
}: {
  className?: string;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}) {
  const { start, end, dataUpdatedAt } = useJournalContext();
  const executionTime = end - start;
  const unit = unitInterval(executionTime);

  const numOfInterval = Math.floor(executionTime / unit);

  const cancelEvent = invocation?.journal?.entries?.find(
    (entry) => entry.category === 'notification' && entry.type === 'Cancel',
  );

  return (
    <>
      <div className="absolute right-0 -left-6 z-0 h-12 rounded-2xl border border-t-2 border-transparent border-white bg-gray-100 shadow-xs"></div>
      {cancelEvent && (
        <div className="pointer-events-none absolute top-12 right-0 bottom-0 left-0 overflow-hidden px-2 transition-all duration-1000">
          <div
            className="h-full w-full rounded-br-2xl border-l-2 border-black/8 bg-zinc-900/50 mix-blend-multiply transition-all duration-1000 [background:repeating-linear-gradient(-45deg,--theme(--color-black/0.04),--theme(--color-black/0.04)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)]"
            style={{
              marginLeft: `calc(${
                ((new Date(String(cancelEvent.start)).getTime() - start) /
                  executionTime) *
                100
              }% - 1px)`,
            }}
          />
        </div>
      )}
      {dataUpdatedAt < end && (
        <div
          style={{
            left: `calc(${
              ((dataUpdatedAt - start) / executionTime) * 100
            }% - 2px - 0.5rem)`,
          }}
          className="absolute top-px right-0 bottom-0 rounded-r-2xl border-l-2 border-white/80 font-sans text-2xs text-gray-500 transition-all duration-1000"
        >
          <div className="absolute inset-0 rounded-r-2xl mix-blend-screen [background:repeating-linear-gradient(-45deg,--theme(--color-white/.6),--theme(--color-white/.6)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)]"></div>
          <div className="absolute z-4 mt-0.5 ml-px rounded-sm border border-white bg-zinc-500 px-1 text-2xs text-white">
            Now
          </div>
        </div>
      )}
      <div className={unitsStyles({ className })}>
        <div className="absolute -top-8 bottom-0 left-2 border-l border-dashed border-gray-500/40 font-sans text-2xs text-gray-500">
          <div className="ml-1 flex w-28 -translate-y-1 flex-col justify-start text-left">
            <DateTooltip date={new Date(start)} title="">
              {new Date(start).toLocaleDateString('en', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </DateTooltip>
            <DateTooltip date={new Date(start)} title="">
              {new Date(start).toLocaleTimeString('en', {
                timeZoneName: 'short',
              })}
            </DateTooltip>
          </div>
        </div>

        <div className="pointer-events-none flex h-full w-full overflow-hidden rounded-r-2xl transition-all duration-1000">
          <div className="w-2 shrink-0" />
          {Array(numOfInterval)
            .fill(null)
            .map((_, i) => {
              return (
                <div
                  key={i}
                  className="pointer-events-none z-3 border-r border-dotted border-black/10 pt-1 pr-0.5 text-right font-sans text-2xs text-gray-500 transition-all duration-1000 even:bg-gray-400/5"
                  style={{
                    width: `${(unit / executionTime) * 100}%`,
                  }}
                >
                  +{formatDurations(getDuration(unit * (i + 1)))}
                </div>
              );
            })}
          <div className="pointer-events-none flex-auto rounded-r-2xl text-right even:bg-gray-400/5"></div>
          <div className="w-2 shrink-0 odd:bg-gray-400/5" />
        </div>
      </div>
    </>
  );
}
