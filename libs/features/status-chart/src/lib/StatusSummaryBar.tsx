import { Link } from '@restate/ui/link';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { STATUS_LABELS } from './constants';
import { getOrderedStatuses, type StatusEntry } from './useOrderedStatuses';

type Entry = {
  name: string;
  count: number;
  isIncluded?: boolean;
} & ReturnType<typeof getOrderedStatuses>[number];

const containerStyles = tv({
  base: 'relative flex h-9 w-full items-stretch gap-[2.5px] py-1',
});

// Match the app's standard skeleton (see ui/table Placeholder.tsx) so the bar
// blends with other loading rows: animate-pulse + slate-200, no white shimmer.
const skeletonStyles = tv({
  base: 'h-9 w-full animate-pulse rounded-md bg-slate-200',
});

// Empty placeholder — same dimensions as a populated bar, just a subtle slate
// fill so the area reads as "no data here" without pulling attention.
const emptyBarStyles = tv({
  base: 'h-9 w-full rounded-md bg-slate-200/60',
});

// Animate flex-grow so segment widths ease between refetches; min-width keeps
// tiny-count segments visible.
const segmentWrapStyles = tv({
  base: 'h-full min-w-[6px] transition-[flex-grow] duration-300 ease-out',
});

// Top-to-bottom gradient and inset white highlight give the segment a "raised"
// volume; identical recipe to BatchProgressBar.
const segmentStyles = tv({
  base: 'relative h-full w-full rounded-md border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_4px_0_rgba(0,0,0,0.15)] transition hover:brightness-105 hover:saturate-150',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
    dimmed: {
      true: 'opacity-40',
      false: '',
    },
  },
});

function Segment({
  entry,
  dimmed,
  href,
  total,
}: {
  entry: Entry;
  dimmed: boolean;
  href?: string;
  total: number;
}) {
  const tooltipContent = (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs font-medium">
        {STATUS_LABELS[entry.name] ?? entry.name}
      </div>
      <div className="text-2xs opacity-80">
        {formatNumber(entry.count, true)} ·{' '}
        {formatPercentageWithoutFraction(entry.count / total)}
      </div>
    </div>
  );

  return (
    <div
      className={segmentWrapStyles()}
      style={{ flexGrow: entry.count, flexBasis: 0 }}
    >
      <HoverTooltip content={tooltipContent} className="h-full">
        <div
          className={segmentStyles({
            borderType: entry.borderType ? 'dashed' : 'solid',
            dimmed,
          })}
          style={{
            backgroundColor: entry.fillLight,
            backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, white 22%, ${entry.fillLight}), ${entry.fillLight})`,
            borderColor: entry.stroke,
          }}
        >
          {href !== undefined && (
            <Link
              href={href}
              preserveQueryParams={false}
              variant="secondary"
              aria-label={`${entry.name}: ${entry.count}`}
              className="absolute inset-0 block rounded-[inherit] no-underline outline-none"
            />
          )}
        </div>
      </HoverTooltip>
    </div>
  );
}

export function StatusSummaryBar({
  byStatus,
  isLoading,
  className,
  isDimmed,
  getHref,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
  className?: string;
  // Per-status dimming signal — caller-driven so the bar stays presentation
  // only. Truthy = fade. Used by the invocations route to sync the bar with
  // active status filters.
  isDimmed?: (statusName: string) => boolean;
  // Per-status link target — caller decides what clicking a segment does.
  // When undefined for a status, the segment is non-interactive (no link).
  getHref?: (statusName: string) => string;
}) {
  const items = getOrderedStatuses(byStatus) as Entry[];
  const total = items.reduce((sum, s) => sum + s.count, 0);

  if (isLoading) {
    return <div className={skeletonStyles({ class: className })} aria-hidden />;
  }

  if (total === 0) {
    return <div className={emptyBarStyles({ class: className })} aria-hidden />;
  }

  return (
    <div className={containerStyles({ class: className })}>
      {items.map((s) => (
        <Segment
          key={s.name}
          entry={s}
          dimmed={isDimmed?.(s.name) ?? false}
          href={getHref?.(s.name)}
          total={total}
        />
      ))}
    </div>
  );
}
