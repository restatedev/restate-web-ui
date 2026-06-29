import { HoverTooltip } from '@restate/ui/tooltip';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { formatPercentageWithoutFraction } from '@restate/util/intl';
import type { VqueueGateDuration } from '@restate/data-access/admin-api-spec';
import { amberShade, gateLabel, raisedFill } from './palette';
import { durationToSeconds, formatVqueueDuration } from './duration';

type BlockedItem = { gate: string; seconds: number };

function toItems(blocks?: VqueueGateDuration[]): BlockedItem[] {
  return (blocks ?? [])
    .map((block) => ({
      gate: block.gate,
      seconds: durationToSeconds(block.duration),
    }))
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

function BlockedRow({
  label,
  caption,
  blocks,
}: {
  label: string;
  caption: string;
  blocks?: VqueueGateDuration[];
}) {
  const items = toItems(blocks);
  const total = items.reduce((sum, item) => sum + item.seconds, 0);
  const totalLabel = total > 0 ? formatVqueueDuration(total * 1000) : '0s';

  const bar = (
    <div className="flex h-3 w-full gap-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
      {items.map((item, i) => {
        const tone = amberShade(i);
        return (
          <div
            key={item.gate}
            className="h-full rounded-[1px] transition-all first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.seconds / total) * 100}%`,
              backgroundColor: `color-mix(in srgb, ${tone.fillLight} 60%, white)`,
              outline: `1px solid ${tone.stroke}`,
              minWidth: 4,
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex h-9 items-center gap-3 px-1.5 py-1 not-last:border-b">
      <span className="w-24 shrink-0 pl-1 text-0.5xs font-medium text-gray-500">
        {label}
      </span>
      {items.length > 0 ? (
        <HoverTooltip
          size="lg"
          className="min-w-0 flex-auto"
          content={
            <div className="flex min-w-[11rem] flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-50 tabular-nums">
                  {totalLabel}
                </span>
                <span className="text-2xs text-gray-400">{caption}</span>
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
                      {formatVqueueDuration(item.seconds * 1000)}
                    </span>
                    <span className="text-2xs text-gray-400 tabular-nums">
                      {formatPercentageWithoutFraction(item.seconds / total)}
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
        <div className="min-w-0 flex-auto">{bar}</div>
      )}
      <span className="shrink-0 text-0.5xs font-medium text-zinc-700 tabular-nums">
        {totalLabel}
      </span>
    </div>
  );
}

export function VqueueBlockedSection({
  total,
  latestAttempt,
  className,
}: {
  total?: VqueueGateDuration[];
  latestAttempt?: VqueueGateDuration[];
  className?: string;
}) {
  const totalSeconds = toItems(total).reduce(
    (sum, item) => sum + item.seconds,
    0,
  );
  if (totalSeconds <= 0) {
    return null;
  }

  return (
    <Section className={className}>
      <SectionTitle>Blocked</SectionTitle>
      <SectionContent className="p-0">
        <BlockedRow label="Total" caption="blocked in total" blocks={total} />
        <BlockedRow
          label="Last attempt"
          caption="blocked on last attempt"
          blocks={latestAttempt}
        />
      </SectionContent>
    </Section>
  );
}
