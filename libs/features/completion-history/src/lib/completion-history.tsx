import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { formatHourRange, formatNumber } from '@restate/util/intl';

const containerStyles = tv({
  base: 'group/bars flex min-w-0 items-stretch gap-0.5',
});

// Matches the "Completed" pie slices: a solid `fillLight` fill (Tailwind
// green/red-300 === STATUS_STYLE fillLight) with a full `stroke` border
// (green/red-500), a white inset highlight on the free edge for the glossy rim,
// rounded outer corners and a soft drop shadow. `mb/mt-px` leaves a small gap on
// either side of the zero baseline.
const barStyles = tv({
  base: 'w-full border drop-shadow-xs transition-[height] duration-500',
  variants: {
    variant: {
      success:
        'mb-px rounded-t-[3px] border-green-500 bg-green-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]',
      error:
        'mt-px rounded-b-[3px] border-red-500 bg-red-300 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.6)]',
    },
    // The current (still-accumulating) hour pulses gently to read as live.
    live: {
      true: 'animate-completionPulse',
      false: '',
    },
  },
});

type CompletionBucket = {
  start: string;
  end: string;
  succeeded: number;
  failed: number;
};

type CompletionHistoryProps = {
  buckets: CompletionBucket[];
  isPending?: boolean;
  className?: string;
};

export function CompletionHistory({
  buckets,
  isPending,
  className,
}: CompletionHistoryProps) {
  if (isPending) {
    return (
      <div className={containerStyles({ className })}>
        <div className="h-full w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  // Shared unit across both halves: succeeded grows up, failed grows down, and
  // the baseline sits proportionally so each side fills its area.
  const maxSucceeded = Math.max(
    1,
    ...buckets.map((bucket) => bucket.succeeded),
  );
  const maxFailed = Math.max(1, ...buckets.map((bucket) => bucket.failed));
  const topPct = (maxSucceeded / (maxSucceeded + maxFailed)) * 100;
  const lastIndex = buckets.length - 1;

  return (
    <div className={containerStyles({ className })}>
      {buckets.map((bucket, index) => {
        const isLive = index === lastIndex;
        return (
          <HoverTooltip
            key={bucket.start}
            size="default"
            className="h-full min-w-0 flex-1 opacity-100 transition-opacity duration-150 group-hover/bars:opacity-40 hover:!opacity-100"
            placement="top"
            content={
              <div className="flex flex-col">
                <div>
                  <div className="text-sm! font-medium text-white/90!">
                    {formatHourRange(
                      new Date(bucket.start),
                      new Date(bucket.end),
                    )}
                  </div>
                  <div className="text-xs! text-gray-300!">
                    {formatHourRange(
                      new Date(bucket.start),
                      new Date(bucket.end),
                      'UTC',
                    )}
                  </div>
                </div>
                <div className="-mx-4 my-4 border-t border-white/20" />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-green-500 bg-green-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]" />
                    <span className="text-base! font-medium text-white/90! tabular-nums">
                      {formatNumber(bucket.succeeded)}
                    </span>
                    <span className="text-xs! text-gray-300!">succeeded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-red-500 bg-red-300 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.4)]" />
                    <span className="text-base! font-medium text-white/90! tabular-nums">
                      {formatNumber(bucket.failed)}
                    </span>
                    <span className="text-xs! text-gray-300!">failed</span>
                  </div>
                </div>
              </div>
            }
          >
            <div className="flex h-full flex-col">
              <div
                className="flex flex-col justify-end"
                style={{ height: `${topPct}%` }}
              >
                <div
                  className={barStyles({ variant: 'success', live: isLive })}
                  style={{
                    height: `${(bucket.succeeded / maxSucceeded) * 100}%`,
                    minHeight: '2px',
                  }}
                />
              </div>
              <div
                className="flex flex-col justify-start"
                style={{ height: `${100 - topPct}%` }}
              >
                <div
                  className={barStyles({ variant: 'error', live: isLive })}
                  style={{
                    height: `${(bucket.failed / maxFailed) * 100}%`,
                    minHeight: '2px',
                  }}
                />
              </div>
            </div>
          </HoverTooltip>
        );
      })}
    </div>
  );
}

export default CompletionHistory;
