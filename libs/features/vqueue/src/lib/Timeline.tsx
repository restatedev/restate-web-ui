import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { formatVqueueDuration } from './duration';

export type TimelineEvent = {
  key: string;
  label: string;
  value?: string;
  color: string;
};

type EventNode = TimelineEvent & { ms: number; agoLabel: string };

// Events keep roomy, readable spacing; a large empty span between two events is
// compressed to a fixed width and marked with a `⁄⁄` break, so a big time jump
// is legible without letting it dominate the track. `now` is the right anchor.
const LEFT = 5;
const RIGHT = 93;
const MIN_SEG = 16;
// Wide enough for the "⁄⁄ 14d 22h" break label and to separate the two events
// it sits between.
const BREAK_SEG = 18;
const BREAK_FACTOR = 3;

function partsToMs(parts: {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}): number {
  return (
    (parts.days ?? 0) * 86_400_000 +
    (parts.hours ?? 0) * 3_600_000 +
    (parts.minutes ?? 0) * 60_000 +
    (parts.seconds ?? 0) * 1_000 +
    (parts.milliseconds ?? 0)
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) {
    return 0;
  }
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return sorted[mid] ?? 0;
  }
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const durationSince = useDurationSinceLastSnapshot();
  const nodes: EventNode[] = events
    .map((event) => {
      if (!event.value) {
        return undefined;
      }
      const { isPast, ...parts } = durationSince(event.value);
      const agoLabel = formatDurations(parts);
      if (!agoLabel) {
        return undefined;
      }
      return { ...event, ms: partsToMs(parts), agoLabel };
    })
    .filter((node): node is EventNode => Boolean(node))
    .sort((a, b) => b.ms - a.ms);

  if (nodes.length === 0) {
    return null;
  }

  // One gap per segment: between consecutive events, then last event → now (0).
  const gaps: number[] = [];
  for (let i = 1; i < nodes.length; i += 1) {
    const prev = nodes[i - 1];
    const cur = nodes[i];
    if (prev && cur) {
      gaps.push(prev.ms - cur.ms);
    }
  }
  const last = nodes[nodes.length - 1];
  if (last) {
    gaps.push(last.ms);
  }

  const med = median(gaps);
  const totalGap = gaps.reduce((sum, gap) => sum + gap, 0);
  // A gap breaks when it's far above the typical gap — or, when the other events
  // are ~simultaneous (median 0, e.g. all "2d 3h ago"), when it dominates the
  // span. Without the second case a single big jump (e.g. last finish → now)
  // would never break.
  const broken = gaps.map(
    (gap) =>
      gaps.length >= 2 &&
      gap > 0 &&
      ((med > 0 && gap > BREAK_FACTOR * med) || gap > totalGap / 2),
  );

  const track = RIGHT - LEFT;
  const breakCount = broken.filter(Boolean).length;
  const normalCount = gaps.length - breakCount;
  const reserved = breakCount * BREAK_SEG + normalCount * MIN_SEG;
  const normalWeight = gaps.reduce(
    (sum, gap, i) => sum + (broken[i] ? 0 : gap),
    0,
  );
  const extra = Math.max(0, track - reserved);

  let widths = gaps.map((gap, i) => {
    if (broken[i]) {
      return BREAK_SEG;
    }
    const share =
      normalWeight > 0
        ? extra * (gap / normalWeight)
        : normalCount > 0
          ? extra / normalCount
          : 0;
    return MIN_SEG + share;
  });
  const sumWidths = widths.reduce((sum, w) => sum + w, 0);
  if (sumWidths > track) {
    const scale = track / sumWidths;
    widths = widths.map((w) => w * scale);
  }

  // Cumulative node positions: xs[0..n-1] = events, xs[n] = now.
  const xs: number[] = [LEFT];
  widths.forEach((w) => xs.push((xs[xs.length - 1] ?? LEFT) + w));
  const nowX = xs[nodes.length] ?? RIGHT;

  return (
    <div className="w-full px-1">
      <div className="relative h-12">
        {/* the baseline runs off both ends — fading in before the first event
            and out past `now` — so the timeline reads as infinite */}
        <div
          className="absolute top-[5px] left-0 h-px bg-gradient-to-r from-transparent to-gray-200"
          style={{ width: `${xs[0] ?? LEFT}%` }}
        />
        <div
          className="absolute top-[5px] h-px bg-gradient-to-r from-gray-200 to-transparent"
          style={{ left: `${nowX}%`, width: `${Math.max(0, 100 - nowX)}%` }}
        />
        {/* baseline; a break leaves a gap holding the ⁄⁄ mark + how much time
            it compresses */}
        {gaps.map((gap, i) => {
          const from = xs[i] ?? LEFT;
          const to = xs[i + 1] ?? RIGHT;
          if (!broken[i]) {
            return (
              <div
                key={`seg-${i}`}
                className="absolute top-[5px] h-px bg-gray-200"
                style={{ left: `${from}%`, width: `${to - from}%` }}
              />
            );
          }
          const mid = (from + to) / 2;
          return (
            <div
              key={`seg-${i}`}
              className="absolute top-[5px] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
              style={{ left: `${mid}%` }}
            >
              <span className="flex items-center gap-[2px]">
                <span className="h-2.5 w-px rotate-[20deg] bg-gray-300" />
                <span className="h-2.5 w-px rotate-[20deg] bg-gray-300" />
              </span>
              <span className="text-3xs whitespace-nowrap text-gray-400 tabular-nums">
                {formatVqueueDuration(gap)}
              </span>
            </div>
          );
        })}

        {nodes.map((node, i) => (
          <div
            key={node.key}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${xs[i] ?? LEFT}%` }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ background: node.color }}
            />
            <span className="mt-2 text-3xs font-medium whitespace-nowrap text-gray-600">
              {node.label}
            </span>
            <span className="text-3xs whitespace-nowrap text-gray-400 tabular-nums">
              {node.agoLabel} ago
            </span>
          </div>
        ))}

        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${nowX}%` }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300 ring-2 ring-white" />
          <span className="mt-2 text-3xs font-medium text-gray-400">now</span>
        </div>
      </div>
    </div>
  );
}
