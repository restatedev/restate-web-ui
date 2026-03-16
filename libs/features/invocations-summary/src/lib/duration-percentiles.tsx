import { tv } from '@restate/util/styles';
import { formatDurations, normaliseDuration } from '@restate/util/intl';

export interface DurationPercentilesData {
  p50: number;
  p90: number;
  p99: number;
}

function formatMs(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const rem1 = ms % 86_400_000;
  const hours = Math.floor(rem1 / 3_600_000);
  const rem2 = rem1 % 3_600_000;
  const minutes = Math.floor(rem2 / 60_000);
  const rem3 = rem2 % 60_000;
  const seconds = Math.floor(rem3 / 1_000);
  const milliseconds = Math.round(rem3 % 1_000);
  const units: [string, number][] = [
    ['days', days],
    ['hours', hours],
    ['minutes', minutes],
    ['seconds', seconds],
    ['milliseconds', milliseconds],
  ];
  const firstNonZero = units.findIndex(([, v]) => v > 0);
  const top = units.slice(firstNonZero, firstNonZero + 3);
  const trimmed = Object.fromEntries(top);
  return formatDurations(normaliseDuration(trimmed));
}

export interface DurationPercentilesProps {
  data?: DurationPercentilesData;
  isFetching?: boolean;
  isPending?: boolean;
}

const containerStyles = tv({
  base: 'flex min-w-44 shrink-0 flex-col self-stretch rounded-2xl bg-zinc-700 filter-[drop-shadow(0_12px_10px_rgb(39_39_42/0.15))_drop-shadow(0_4px_5px_rgb(39_39_42/0.2))]',
});

const innerStyles = tv({
  base: 'flex min-h-0 flex-1 flex-col py-1.5',
  variants: {
    loading: {
      true: 'animate-pulse',
    },
  },
});

const barStyles = tv({
  base: 'h-full rounded-full transition-all duration-500 ease-out',
  variants: {
    loading: {
      true: 'animate-pulse bg-white/15',
      false: 'bg-blue-400/50',
    },
  },
  defaultVariants: {
    loading: false,
  },
});

const ROWS = [
  { key: 'p50', label: 'p50' },
  { key: 'p90', label: 'p90' },
  { key: 'p99', label: 'p99' },
] as const;

const PLACEHOLDER_PCTS = [30, 60, 90];

export function DurationPercentiles({ data, isFetching, isPending }: DurationPercentilesProps) {
  const isLoading = Boolean(isPending) || Boolean(isFetching);
  const hasData = Boolean(data);
  const max = data ? Math.max(data.p50, data.p90, data.p99, 1) : 1;

  return (
    <div className={containerStyles()}>
      <div className={innerStyles({ loading: isLoading })}>
        <div className="border-b border-black/20 pb-0.5">
          <div className="flex h-10 flex-col justify-center px-4">
            <div className="text-sm font-medium text-zinc-300">
              Invocation duration
            </div>
            <div className="mr-4 text-2xs text-zinc-400">
              Time since the invocation started
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center divide-y divide-black/20">
          {ROWS.map((row, i) => {
            const ms = isLoading ? undefined : data?.[row.key];
            const pct = ms !== undefined ? (ms / max) * 100 : (PLACEHOLDER_PCTS[i] ?? 50);
            return (
              <div
                key={row.key}
                className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-4"
              >
                <span className="text-xs text-zinc-400">{row.label}</span>
                {ms !== undefined ? (
                  <span className="text-base font-medium tracking-tight text-zinc-200 tabular-nums">
                    {formatMs(ms)}
                  </span>
                ) : isLoading ? (
                  <span className="my-0.5 h-5 w-24 rounded bg-white/10" />
                ) : (
                  <span className="text-base font-medium tracking-tight text-zinc-500">
                    –
                  </span>
                )}
                <div className="mt-0.5 h-1 w-full">
                  <div
                    className={barStyles({ loading: isLoading })}
                    style={{ width: isLoading ? `${PLACEHOLDER_PCTS[i] ?? 50}%` : hasData ? `${Math.max(pct, 2)}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
