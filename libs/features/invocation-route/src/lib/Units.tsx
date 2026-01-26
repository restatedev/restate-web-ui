import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { tv } from '@restate/util/styles';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DateTooltip } from '@restate/ui/tooltip';

const NICE_INTERVALS = [
  1,
  5,
  10,
  25,
  50,
  100,
  500,
  1000,
  2000,
  5000,
  10_000,
  15_000,
  30_000,
  60_000,
  2 * 60_000,
  5 * 60_000,
  10 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
  2 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
];

function computeInterval(duration: number) {
  const idealInterval = duration / 4;
  const matchedIndex = NICE_INTERVALS.findIndex(
    (interval) => interval >= idealInterval,
  );

  if (matchedIndex === -1) {
    return Math.ceil(idealInterval);
  }

  const matchedInterval = NICE_INTERVALS[matchedIndex]!;

  if (Math.ceil(duration / matchedInterval) >= 3) {
    return matchedInterval;
  } else if (
    matchedIndex >= 1 &&
    Math.ceil(duration / NICE_INTERVALS[matchedIndex - 1]!) < 6
  ) {
    return NICE_INTERVALS[matchedIndex - 1]!;
  } else {
    return Math.ceil(idealInterval);
  }
}

const containerStyles = tv({
  base: 'transition-all duration-1000',
});

const intervalStyles = tv({
  base: 'pointer-events-none border-r border-dotted pt-1 pr-0.5 text-right font-sans text-2xs transition-all duration-1000',
  variants: {
    variant: {
      fullTrace: 'z-3 border-black/10 text-gray-500 even:bg-gray-400/5',
      header: 'z-3 border-black/10 text-gray-500 even:bg-gray-400/5',
    },
  },
});

const remainderStyles = tv({
  base: 'pointer-events-none flex-auto rounded-r-2xl text-right',
  variants: {
    variant: {
      fullTrace: 'even:bg-gray-400/5',
      header: 'even:bg-gray-400/5',
    },
  },
});

export function Units({
  className,
  start,
  end,
  dataUpdatedAt,
  cancelEvent,
}: {
  className?: string;
  start: number;
  end: number;
  dataUpdatedAt: number;
  cancelEvent?: JournalEntryV2;
}) {
  const duration = end - start;
  const unit = computeInterval(duration) || duration / 2 || 1;
  const numOfIntervals = Math.floor(duration / unit);

  return (
    <>
      <div className="absolute right-0 -left-6 z-0 h-12 rounded-2xl border border-t-2 border-white bg-gray-100 shadow-xs" />
      {cancelEvent && (
        <div className="pointer-events-none absolute top-12 right-0 bottom-0 left-0 overflow-hidden px-2 transition-all duration-1000">
          <div
            className="h-full w-full rounded-br-2xl border-l-2 border-black/8 mix-blend-multiply transition-all duration-1000 [background:repeating-linear-gradient(-45deg,--theme(--color-black/0.05),--theme(--color-black/0.05)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)_fixed]"
            style={{
              marginLeft: `calc(${
                ((new Date(String(cancelEvent?.start)).getTime() - start) /
                  duration) *
                100
              }% - 1px)`,
            }}
          />
        </div>
      )}
      {dataUpdatedAt < end && (
        <div
          style={{
            left: `calc(${((dataUpdatedAt - start) / duration) * 100}% - 2px - 0.5rem)`,
          }}
          className="absolute top-px right-0 bottom-0 rounded-r-2xl border-l-2 border-white/80 font-sans text-2xs text-gray-500 transition-all duration-1000"
        >
          <div className="absolute inset-0 rounded-r-2xl mix-blend-screen [background:repeating-linear-gradient(-45deg,--theme(--color-white/.6),--theme(--color-white/.6)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)]" />
          <div className="absolute z-4 mt-0.5 ml-px rounded-sm border border-white bg-zinc-500 px-1 text-2xs text-white">
            Now
          </div>
        </div>
      )}
      <div className={containerStyles({ className })}>
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
          {Array(numOfIntervals)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className={intervalStyles({ variant: 'fullTrace' })}
                style={{ width: `${(unit / duration) * 100}%` }}
              >
                +{formatDurations(getDuration(unit * (i + 1)))}
              </div>
            ))}
          <div className={remainderStyles({ variant: 'fullTrace' })} />
          <div className="w-2 shrink-0 odd:bg-gray-400/5" />
        </div>
      </div>
    </>
  );
}

export function HeaderUnits({
  className,
  start,
  end,
}: {
  className?: string;
  start: number;
  end: number;
}) {
  const duration = end - start;
  const unit = computeInterval(duration) || duration / 2 || 1;
  const numOfIntervals = Math.floor(duration / unit);

  return (
    <div className={containerStyles({ className })}>
      <div className="pointer-events-none flex h-full w-full overflow-hidden rounded-r-2xl transition-all duration-1000">
        <div className="w-2 shrink-0" />
        {Array(numOfIntervals)
          .fill(null)
          .map((_, i) => (
            <div
              key={i}
              className={intervalStyles({ variant: 'header' })}
              style={{ width: `${(unit / duration) * 100}%` }}
            >
              +{formatDurations(getDuration(unit * (i + 1)))}
            </div>
          ))}
        <div className={remainderStyles({ variant: 'header' })} />
        <div className="w-2 shrink-0 odd:bg-gray-400/5" />
      </div>
    </div>
  );
}
