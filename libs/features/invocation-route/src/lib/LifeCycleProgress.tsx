import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api';
import { tv } from 'tailwind-variants';
import { EntryProgress, EntryProgressContainer } from './EntryProgress';
import { useJournalContext } from './JournalContext';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DateTooltip, HoverTooltip } from '@restate/ui/tooltip';

function unitInterval(duration: number) {
  const niceIntervals = [
    10, // 10 ms
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
    (interval) => interval >= idealInterval
  );

  if (matchedIntervalIndex === -1) {
    return Math.ceil(idealInterval);
  }
  const matchedInterval = niceIntervals.at(matchedIntervalIndex) as number;

  if (Math.ceil(duration / matchedInterval) >= 3) {
    return niceIntervals.at(matchedIntervalIndex) as number;
  } else if (matchedIntervalIndex >= 1) {
    return niceIntervals.at(matchedIntervalIndex - 1) as number;
  } else {
    return Math.ceil(idealInterval);
  }
}

const styles = tv({
  base: 'rounded flex flex-col items-center relative rounded-t-2xl shadow-sm rounded-2xl rounded-l-none border-black/10',
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
    (entry) => entry.category === 'event' && entry.type === 'Created'
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
      (entry.category === 'notification' && entry.type === 'Cancel')
  );

  return (
    <div className={styles({ className })}>
      <div className="relative h-6 w-full mt-4">
        {createdEvent && (
          <EntryProgressContainer
            className="absolute top-1"
            entry={createdEvent}
            invocation={invocation}
          >
            <div className=" w-full h-6 rounded-md" />
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
              className="[&>*]:h-3.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const unitsStyles = tv({
  base: '',
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
    (entry) => entry.category === 'notification' && entry.type === 'Cancel'
  );

  return (
    <>
      <div className="absolute h-12 -left-6 right-0 border-transparent bg-gray-100 border-white rounded-2xl shadow-sm border border-t-[2px] z-[0]"></div>
      {cancelEvent && (
        <div
          className="top-12 pointer-events-none mix-blend-overlay border-l-2  bottom-0 absolute bg-zinc-900/50 [background:repeating-linear-gradient(-45deg,theme(colors.black/.6),theme(colors.black/.6)_2px,theme(colors.white/0)_2px,theme(colors.white/0)_4px)] right-0 rounded-br-2xl"
          style={{
            left: `calc(${
              ((new Date(String(cancelEvent.start)).getTime() - start) /
                executionTime) *
              100
            }% + 2px)`,
          }}
        />
      )}
      <div className={unitsStyles({ className })}>
        <div className="absolute left-2 border-l text-gray-500 border-dashed text-2xs font-sans border-gray-500/40  bottom-0 -top-8">
          <div className=" text-left ml-1 flex justify-start flex-col  -translate-y-1 w-28">
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
        {dataUpdatedAt < end && (
          <div
            style={{
              left: `calc(${
                ((dataUpdatedAt - start) / executionTime) * 100
              }% - 2px - 0.5rem)`,
            }}
            className="absolute border-l-2 text-gray-500  text-2xs font-sans border-white/80  bottom-0 top-px "
          >
            <HoverTooltip content="Now">
              <div className="absolute left-0 top-0 h-full w-2 z-[1]" />
            </HoverTooltip>
          </div>
        )}

        <div className="w-full h-full flex pointer-events-none overflow-hidden rounded-r-2xl ">
          <div className="w-2 shrink-0" />
          {Array(numOfInterval)
            .fill(null)
            .map((_, i) => {
              return (
                <div
                  key={i}
                  className="text-right text-2xs font-sans pr-0.5 pt-1 text-gray-500  border-r border-black/10 border-dotted pointer-events-none even:bg-gray-400/5"
                  style={{
                    width: `${(unit / executionTime) * 100}%`,
                  }}
                >
                  +{formatDurations(getDuration(unit * (i + 1)))}
                </div>
              );
            })}
          <div className="flex-auto text-right pointer-events-none even:bg-gray-400/5 rounded-r-2xl"></div>
          <div className="w-2 shrink-0" />
        </div>
      </div>
    </>
  );
}
