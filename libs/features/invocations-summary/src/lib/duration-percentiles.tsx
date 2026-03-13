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
  return formatDurations(
    normaliseDuration({ days, hours, minutes, seconds, milliseconds }),
  );
}

export interface DurationPercentilesProps {
  data?: DurationPercentilesData;
}

const containerStyles = tv({
  base: 'flex min-w-44 shrink-0 flex-col self-stretch rounded-2xl bg-zinc-700 filter-[drop-shadow(0_8px_6px_rgb(39_39_42/0.15))_drop-shadow(0_4px_3px_rgb(39_39_42/0.2))]',
});

const ROWS = [
  { key: 'p50', label: 'p50' },
  { key: 'p90', label: 'p90' },
  { key: 'p99', label: 'p99' },
] as const;

export function DurationPercentiles({ data }: DurationPercentilesProps) {
  if (!data) return null;

  const max = Math.max(data.p50, data.p90, data.p99, 1);

  return (
    <div className={containerStyles()}>
      <div className="flex min-h-0 flex-1 flex-col py-1.5">
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
          {ROWS.map((row) => {
            const ms = data[row.key];
            const pct = (ms / max) * 100;
            return (
              <div
                key={row.key}
                className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-4"
              >
                <span className="text-xs text-zinc-400">{row.label}</span>
                <span className="text-lg font-semibold tracking-tight text-zinc-200 tabular-nums">
                  {formatMs(ms)}
                </span>
                <div className="mt-0.5 h-1 w-full">
                  <div
                    className="h-full rounded-full bg-blue-400/50"
                    style={{ width: `${Math.max(pct, 2)}%` }}
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
