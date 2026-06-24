import { Link } from '@restate/ui/link';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';
import type { ReactNode } from 'react';
import {
  formatNumber,
  formatPlurals,
  formatPercentageWithoutFraction,
  formatApproxPercentage,
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
  variants: {
    pulse: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

// Match the app's standard skeleton (see ui/table Placeholder.tsx) so the bar
// blends with other loading rows: animate-pulse + slate-200, no white shimmer.
const skeletonStyles = tv({
  base: 'h-9 w-full animate-pulse rounded-md bg-slate-200',
});

// Empty state — a single full-width "track" rendered inside the standard
// container, so it shares the populated bar's exact footprint and the layout
// doesn't shift when data arrives. A recessed, dashed outline reads as an
// intentional "no invocations" placeholder rather than a stuck loading
// skeleton; the raised gradient segments are reserved for real data.
const emptyTrackStyles = tv({
  base: 'h-full w-full rounded-md border-[1.5px] border-dashed border-gray-300/70 bg-gray-200/70 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)]',
});

// Animate flex-grow so segment widths ease between refetches; min-width keeps
// tiny-count segments visible.
const segmentWrapStyles = tv({
  base: 'h-full min-w-[6px] transition-[flex-grow] duration-300 ease-out',
});

// Top-to-bottom gradient and inset white highlight give the segment a "raised"
// volume; identical recipe to BatchProgressBar.
const segmentStyles = tv({
  base: 'relative h-full w-full rounded-md border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_4px_0_rgba(0,0,0,0.15)] transition hover:brightness-[1.03]',
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
  isSampled,
}: {
  entry: Entry;
  dimmed: boolean;
  href?: string;
  total: number;
  isSampled?: boolean;
}) {
  const percentage = formatPercentageWithoutFraction(entry.count / total);
  const label = STATUS_LABELS[entry.name] ?? entry.name;
  const tooltipContent = (
    <div className="flex min-w-56 flex-col">
      <div className="mb-2">
        <div className="text-base! leading-7 font-medium text-gray-300!">
          {label}
        </div>
        <TooltipSummary href={href}>
          {isSampled ? (
            <>
              <span className="!text-xl !text-gray-50">
                {formatApproxPercentage(entry.count / total)}
              </span>
              <span className="!text-sm !text-gray-400">of invocations</span>
              <span className="!text-sm !text-gray-500">· sampled</span>
            </>
          ) : (
            <>
              <span className="!text-xl !text-gray-50">
                {formatNumber(entry.count, true)}
              </span>
              <span className="!text-sm !text-gray-400">
                {formatPlurals(entry.count, {
                  one: 'invocation',
                  other: 'invocations',
                })}
              </span>
              <span className="!text-sm !text-gray-500">· {percentage}</span>
            </>
          )}
        </TooltipSummary>
      </div>
    </div>
  );

  return (
    <div
      className={segmentWrapStyles()}
      style={{ flexGrow: entry.count, flexBasis: 0 }}
    >
      <HoverTooltip content={tooltipContent} className="h-full" size="lg">
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

function TooltipSummary({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  const className =
    '-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1 !text-inherit no-underline shadow-none hover:bg-white/10';

  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link
      href={href}
      preserveQueryParams={false}
      variant="secondary"
      className={className}
    >
      {children}
      <Icon
        name={IconName.ChevronRight}
        className="ml-auto h-3.5 w-3.5 shrink-0 !text-zinc-500"
      />
    </Link>
  );
}

export function StatusSummaryBar({
  byStatus,
  isLoading,
  isFetching,
  className,
  isDimmed,
  getHref,
  isSampled,
}: {
  byStatus: StatusEntry[];
  // No data yet — render the full skeleton. Used for the first load.
  isLoading?: boolean;
  // Have data but a refetch is in flight — render normally but pulse so the
  // user sees something is happening. Ignored when isLoading is true.
  isFetching?: boolean;
  className?: string;
  // Per-status dimming signal — caller-driven so the bar stays presentation
  // only. Truthy = fade. Used by the invocations route to sync the bar with
  // active status filters.
  isDimmed?: (statusName: string) => boolean;
  // Per-status link target — caller decides what clicking a segment does.
  // When undefined for a status, the segment is non-interactive (no link).
  getHref?: (statusName: string) => string;
  // Counts are estimates from a sampled summary — tooltip hides raw counts
  // and shows percentages with a sampled marker.
  isSampled?: boolean;
}) {
  const items = getOrderedStatuses(byStatus) as Entry[];
  const total = items.reduce((sum, s) => sum + s.count, 0);

  if (isLoading) {
    return <div className={skeletonStyles({ class: className })} aria-hidden />;
  }

  const pulse = Boolean(isFetching);

  if (total === 0) {
    return (
      <div className={containerStyles({ pulse, class: className })} aria-hidden>
        <div className={emptyTrackStyles()} />
      </div>
    );
  }

  return (
    <div className={containerStyles({ pulse, class: className })}>
      {items.map((s) => (
        <Segment
          key={s.name}
          entry={s}
          dimmed={isDimmed?.(s.name) ?? false}
          href={getHref?.(s.name)}
          total={total}
          isSampled={isSampled}
        />
      ))}
    </div>
  );
}
