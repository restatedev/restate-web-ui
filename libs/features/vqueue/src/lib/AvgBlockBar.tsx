import { HoverTooltip } from '@restate/ui/tooltip';
import { formatPercentageWithoutFraction } from '@restate/util/intl';
import type { VqueueGateDuration } from '@restate/data-access/admin-api-spec';
import { durationToSeconds, formatVqueueDuration } from './duration';
import { amberShade, gateLabel, raisedFill } from './palette';

// A thin amber pill matching the stage time bars (h-1, rounded-full): monochrome
// amber, biggest slice darkest, no legend. The label (when shown) sits above the
// bar; the per-gate breakdown (value + percentage) lives in the hover tooltip.
export function AvgBlockBar({
  blocks,
  className,
  live = false,
  showLabel = true,
}: {
  blocks: VqueueGateDuration[];
  className?: string;
  // Live "currently blocked" breakdown (the scheduler's *_block_duration) rather
  // than the EMA average — swaps the captions to the present tense.
  live?: boolean;
  // When false, render just the bar (+ tooltip); the caller supplies its own
  // label (e.g. the head block's duration). Also drives the bar width.
  showLabel?: boolean;
}) {
  const items = blocks
    .map((block) => ({
      gate: block.gate,
      raw: block.duration,
      seconds: durationToSeconds(block.duration),
    }))
    .filter((block) => block.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  if (items.length === 0) {
    return null;
  }

  const total = items.reduce((sum, item) => sum + item.seconds, 0);
  const totalLabel = formatVqueueDuration(total * 1000);

  return (
    <HoverTooltip
      size="lg"
      className={className}
      content={
        <div className="flex min-w-[11rem] flex-col gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-gray-50 tabular-nums">
              {totalLabel}
            </span>
            <span className="text-2xs text-gray-400">
              {live ? 'blocked currently' : 'blocked on average'}
            </span>
          </div>
          <div className="-mx-3 border-t border-white/10" />
          <div className="flex flex-col gap-1">
            {items.map((item, i) => (
              <div key={item.gate} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px] border-[1.5px]"
                  style={raisedFill(amberShade(i))}
                />
                <span className="text-2xs text-gray-300">
                  {gateLabel(item.gate)}
                </span>
                <span className="ml-auto text-2xs font-semibold text-gray-100 tabular-nums">
                  {formatVqueueDuration(item.raw)}
                </span>
                <span className="text-2xs text-gray-400 tabular-nums">
                  {total > 0
                    ? formatPercentageWithoutFraction(item.seconds / total)
                    : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div className="mt-2 flex flex-col gap-1">
        {showLabel && (
          <span className="text-2xs whitespace-nowrap text-gray-400">
            <span className="font-medium text-gray-500 tabular-nums">
              {totalLabel}
            </span>{' '}
            avg blocked
          </span>
        )}
        <div className="flex h-1 w-full gap-[1.5px] overflow-hidden rounded-full bg-gray-100">
          {items.map((item, i) => (
            <div
              key={item.gate}
              className="h-full"
              style={{
                // Normalise so the grow factors sum to 1 — sub-second totals
                // would otherwise leave the bar mostly empty (sum < 1).
                flexGrow: item.seconds / total,
                flexBasis: 0,
                backgroundColor: amberShade(i).fillLight,
              }}
            />
          ))}
        </div>
      </div>
    </HoverTooltip>
  );
}
