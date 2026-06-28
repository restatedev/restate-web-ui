import { HoverTooltip } from '@restate/ui/tooltip';
import { formatPercentageWithoutFraction } from '@restate/util/intl';
import type { VqueueGateDuration } from '@restate/data-access/admin-api-spec';
import { STAGE_TONES, amberShade, gateLabel } from './palette';
import { durationToSeconds, formatVqueueDuration } from './duration';

type StatSegment = {
  key: string;
  label: string;
  seconds: number;
  color: string;
};
type Stat = {
  key: string;
  label: string;
  tooltipLabel: string;
  total: number;
  segments: StatSegment[];
};

// One stat row: value + label (right-aligned, left of the bar) and a thin bar.
// The bar's filled length is total / maxScale, so every row shares one scale and
// their lengths are comparable; segments are the breakdown within the fill.
function StatRow({ stat, maxScale }: { stat: Stat; maxScale: number }) {
  const visible = stat.segments.filter((segment) => segment.seconds > 0);
  const fillPct = maxScale > 0 ? (stat.total / maxScale) * 100 : 0;
  const totalLabel =
    stat.total > 0 ? formatVqueueDuration(stat.total * 1000) : '0s';

  const bar = (
    <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
      {visible.length > 0 && (
        <div
          className="flex h-full gap-[1.5px] overflow-hidden rounded-full"
          style={{ width: `${fillPct}%` }}
        >
          {visible.map((segment) => (
            <div
              key={segment.key}
              className="h-full"
              style={{
                // Normalise so the grow factors sum to 1 (sub-second totals would
                // otherwise leave the fill mostly empty).
                flexGrow: segment.seconds / stat.total,
                flexBasis: 0,
                backgroundColor: segment.color,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <span className="text-right text-2xs whitespace-nowrap text-gray-400">
        <span className="font-medium text-gray-500 tabular-nums">
          {totalLabel}
        </span>{' '}
        {stat.label}
      </span>
      {visible.length > 0 ? (
        <HoverTooltip
          size="lg"
          content={
            <div className="flex min-w-[11rem] flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-50 tabular-nums">
                  {totalLabel}
                </span>
                <span className="text-2xs text-gray-400">
                  {stat.tooltipLabel}
                </span>
              </div>
              <div className="-mx-3 border-t border-white/10" />
              <div className="flex flex-col gap-1">
                {visible.map((segment) => (
                  <div key={segment.key} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-2xs text-gray-300">
                      {segment.label}
                    </span>
                    <span className="ml-auto text-2xs font-semibold text-gray-100 tabular-nums">
                      {formatVqueueDuration(segment.seconds * 1000)}
                    </span>
                    <span className="text-2xs text-gray-400 tabular-nums">
                      {formatPercentageWithoutFraction(
                        segment.seconds / stat.total,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          {bar}
        </HoverTooltip>
      ) : (
        bar
      )}
    </>
  );
}

// The queue's recent (moving-average) stats: the lifecycle split and the typical
// block wait, stacked on one shared scale.
export function QueueStats({
  queueSeconds,
  e2eSeconds,
  avgBlocks,
  blocked,
}: {
  queueSeconds: number;
  e2eSeconds: number;
  avgBlocks: VqueueGateDuration[];
  blocked: boolean;
}) {
  const stats: Stat[] = [];

  if (e2eSeconds > 0) {
    stats.push({
      key: 'e2e',
      label: 'avg end to end',
      tooltipLabel: 'end to end on average',
      total: e2eSeconds,
      segments: [
        {
          key: 'queue',
          label: 'queue',
          seconds: queueSeconds,
          color: STAGE_TONES.inbox.stroke,
        },
        {
          key: 'processing',
          label: 'processing',
          seconds: Math.max(0, e2eSeconds - queueSeconds),
          color: STAGE_TONES.running.stroke,
        },
      ],
    });
  }

  const avgItems = avgBlocks
    .map((block) => ({
      gate: block.gate,
      seconds: durationToSeconds(block.duration),
    }))
    .filter((block) => block.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  // currently blocked with no EMA yet → the live wait shows in the head, so
  // nothing here; otherwise always show the (possibly 0s) typical block wait.
  if (avgItems.length > 0 || !blocked) {
    stats.push({
      key: 'avg-blocked',
      label: 'avg blocked',
      tooltipLabel: 'blocked on average',
      total: avgItems.reduce((sum, item) => sum + item.seconds, 0),
      segments: avgItems.map((item, i) => ({
        key: item.gate,
        label: gateLabel(item.gate),
        seconds: item.seconds,
        color: amberShade(i).fillLight,
      })),
    });
  }

  if (stats.length === 0) {
    return null;
  }

  const maxScale = Math.max(...stats.map((stat) => stat.total));

  return (
    <div className="grid grid-cols-[auto_10rem] items-center gap-x-2 gap-y-1">
      {stats.map((stat) => (
        <StatRow key={stat.key} stat={stat} maxScale={maxScale} />
      ))}
    </div>
  );
}
