import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { tv } from '@restate/util/styles';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DateTooltip } from '@restate/ui/tooltip';
import { CSSProperties, useDeferredValue, useRef } from 'react';

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

const TARGET_VIEW_INTERVALS = 4;
const VIEW_INTERVAL_TOLERANCE = 1;
const MAX_RENDERED_INTERVALS = 2000;
const INTERVAL_SWITCH_HYSTERESIS = 0.5;

function computeInterval(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 1;
  }

  const minIntervals = TARGET_VIEW_INTERVALS - VIEW_INTERVAL_TOLERANCE;
  const maxIntervals = TARGET_VIEW_INTERVALS + VIEW_INTERVAL_TOLERANCE;
  const idealInterval = duration / TARGET_VIEW_INTERVALS;
  const minInterval = duration / maxIntervals;
  const maxInterval = duration / minIntervals;

  const inRangeCandidates = NICE_INTERVALS.filter(
    (interval) => interval >= minInterval && interval <= maxInterval,
  );

  if (inRangeCandidates.length > 0) {
    return inRangeCandidates.reduce((best, current) =>
      Math.abs(current - idealInterval) < Math.abs(best - idealInterval)
        ? current
        : best,
    );
  }

  if (idealInterval > NICE_INTERVALS[NICE_INTERVALS.length - 1]!) {
    return Math.ceil(idealInterval);
  }

  return NICE_INTERVALS.reduce((best, current) =>
    Math.abs(current - idealInterval) < Math.abs(best - idealInterval)
      ? current
      : best,
  );
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
  base: 'pointer-events-none flex-auto text-right',
  variants: {
    variant: {
      fullTrace: 'even:bg-gray-400/5',
      header: 'even:bg-gray-400/5',
    },
  },
});

export function Units({
  className,
  style,
  start,
  end,
  dataUpdatedAt,
  cancelEvent,
  viewportDuration,
}: {
  className?: string;
  style?: CSSProperties;
  start: number;
  end: number;
  dataUpdatedAt: number;
  cancelEvent?: JournalEntryV2;
  viewportDuration?: number;
}) {
  const duration = end - start;
  const intervalBaseDuration =
    viewportDuration && viewportDuration > 0 ? viewportDuration : duration;
  const deferredIntervalBaseDuration = useDeferredValue(intervalBaseDuration);
  const desiredUnit = computeInterval(deferredIntervalBaseDuration);
  const targetUnitRef = useRef(desiredUnit);
  const intervalsWithCurrentUnit = intervalBaseDuration / targetUnitRef.current;
  const minAllowedIntervals =
    TARGET_VIEW_INTERVALS - VIEW_INTERVAL_TOLERANCE - INTERVAL_SWITCH_HYSTERESIS;
  const maxAllowedIntervals =
    TARGET_VIEW_INTERVALS + VIEW_INTERVAL_TOLERANCE + INTERVAL_SWITCH_HYSTERESIS;

  if (
    !Number.isFinite(intervalsWithCurrentUnit) ||
    intervalsWithCurrentUnit < minAllowedIntervals ||
    intervalsWithCurrentUnit > maxAllowedIntervals
  ) {
    targetUnitRef.current = desiredUnit;
  }

  const minUnitForRenderCap =
    duration > 0 ? Math.ceil(duration / MAX_RENDERED_INTERVALS) : 1;
  const unit = Math.max(targetUnitRef.current, minUnitForRenderCap);
  const numOfIntervals = Math.floor(duration / unit);

  return (
    <div className={containerStyles({ className })} style={style}>
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
      <div className="h-full">
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
    </div>
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
