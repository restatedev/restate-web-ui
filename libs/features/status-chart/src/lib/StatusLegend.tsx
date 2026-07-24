import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import type { ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { Link } from '@restate/ui/link';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import {
  formatNumber,
  formatApproxPercentage,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { toInvocationsHref } from '@restate/util/invocation-links';
import { useRestateContext } from '@restate/features/restate-context';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';
import { type StatusEntry } from './useOrderedStatuses';
import { type ArcSegment } from './heroSegments';
import { StageBreakdownPopoverContent } from './StageBreakdownPopoverContent';

export const legendStyles = tv({
  base: 'flex items-start outline-none',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
    orientation: {
      horizontal:
        'mx-auto max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1',
      // Single-column grid (not flex-col): grid rows are sized to the track,
      // so with min-w-0 they shrink to the column width and their labels can
      // truncate. A flex column leaves rows at content width on the cross axis,
      // so they overflow instead.
      vertical: 'grid grid-cols-1 gap-0.5',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

const legendItemStyles = tv({
  base: 'flex items-center gap-1.5 px-1.5 py-0.5 outline-offset-2 outline-blue-600 transition',
  variants: {
    state: {
      success:
        'cursor-pointer rounded-md text-gray-700 no-underline hover:bg-black/5 focus-visible:outline-2',
      loading: 'cursor-default outline-none',
      error: 'cursor-default opacity-50 outline-none',
    },
    // Three visual states (priority: faded > dimmed > normal):
    //   * `faded` — count is 0 in the current scope, so the row is a
    //     placeholder. De-emphasized but not desaturated.
    //   * `dimmed` — status doesn't pass the active filter; saturate-50 +
    //     low opacity mirrors the bar's segment dimming.
    //   * `normal` — has data and matches (or no filter).
    appearance: {
      normal: '',
      dimmed: 'opacity-40 saturate-50',
      faded: 'opacity-50',
    },
    // Vertical (flanking) legends are constrained to their grid column, so the
    // row caps at the column width and its label truncates instead of spilling
    // out of the layout. Horizontal legends wrap between items as before.
    orientation: {
      horizontal: '',
      vertical: 'max-w-full min-w-0',
    },
    compact: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      orientation: 'vertical',
      compact: false,
      class: 'w-max max-w-none',
    },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    compact: true,
  },
});

const ALL_STATUSES = STATUS_ORDER.map((name) => ({
  name,
  ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
}));

const bulletStyles = tv({
  base: 'h-3 w-3 shrink-0 rounded-full border-[1.5px]',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
    state: {
      success: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
      loading: 'opacity-40',
      error: '',
    },
  },
});

const labelStyles = tv({
  base: 'text-xs',
  variants: {
    // Vertical rows truncate within their column; horizontal rows stay on one
    // line and wrap between items.
    orientation: {
      horizontal: 'whitespace-nowrap',
      vertical: 'min-w-0 truncate',
    },
    compact: {
      true: '',
      false: '',
    },
    tone: {
      normal: 'text-gray-600',
      muted: 'text-gray-400',
    },
  },
  compoundVariants: [
    {
      orientation: 'vertical',
      compact: false,
      class: 'min-w-max! overflow-visible! text-clip! whitespace-nowrap',
    },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    compact: true,
    tone: 'normal',
  },
});

type LegendRow = {
  name: string;
  label: string;
  count: number;
  fillLight: string;
  stroke: string;
  borderType?: 'dashed' | number[];
  href?: string;
};

export function StatusLegend({
  byStatus = [],
  isLoading,
  isError,
  linkParams,
  getHref,
  orientation = 'horizontal',
  className,
  isDimmed,
  isItemLoading,
  isItemSampled,
  allItem,
  isSampled,
  leading,
  items,
  compact = true,
  totalCount,
  breakdown,
}: {
  byStatus?: StatusEntry[];
  isLoading?: boolean;
  isError?: boolean;
  linkParams?: URLSearchParams;
  // Caller-driven per-status href builder. When provided, takes precedence
  // over the internal `toInvocationsHref(linkParams)` construction — used by
  // the invocations route to preserve sibling filters (e.g.,
  // filter_target_service_name) that `toInvocationsHref` would strip.
  getHref?: (statusName: string) => string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  // Caller-driven dimming. When truthy for a given status name, that row is
  // faded — used by the invocations route to mirror the bar chart's
  // filter_status dimming. Component is agnostic to where the signal comes
  // from.
  isDimmed?: (statusName: string) => boolean;
  isItemLoading?: (statusName: string) => boolean;
  isItemSampled?: (statusName: string) => boolean;
  // Leading "All" reset entry — mirrors the All tab in the service tab strip.
  // When provided, prepended to the legend; clicking it should clear the
  // status filter (caller builds the href). Dimmed alongside non-matching
  // status rows whenever any status filter is active.
  allItem?: { count: number; href: string; dimmed: boolean };
  // Counts are estimates from a sampled summary — chips render percentages
  // of the in-scope total instead of raw numbers; the All chip is hidden
  // (it would always be 100%).
  isSampled?: boolean;
  // Custom content rendered as the first legend cell — used by the
  // invocations route to embed a count-mode toggle inline with the chips.
  leading?: ReactNode;
  // Explicit, pre-built entries (label/count/style/href). When provided the
  // legend renders these verbatim instead of deriving rows from the canonical
  // status list — used by the overview hero, where each gauge has its own
  // bespoke set (the aggregate "In-flight" bucket, or just the in-flight
  // statuses). `allItem`/`getHref` are ignored in this mode.
  items?: ArcSegment[];
  compact?: boolean;
  totalCount?: number;
  breakdown?: {
    name: string;
    items: ArcSegment[];
    isLoading?: boolean;
    isError?: boolean;
    isSampled?: boolean;
  };
}) {
  const { baseUrl } = useRestateContext();
  const state = isLoading ? 'loading' : isError ? 'error' : 'success';

  // Counts looked up from byStatus (status mode); missing entries render as 0.
  const countByStatus = new Map<string, number>();
  for (const entry of byStatus) {
    if (entry.count > 0) countByStatus.set(entry.name, entry.count);
  }

  // The API-defined buckets are authoritative once data is available. The
  // canonical list is used only to keep the initial loading skeleton stable.
  const rows: LegendRow[] = items
    ? items
    : byStatus.length > 0
      ? byStatus.map((entry) => {
          const style = STATUS_STYLE[entry.name] ?? DEFAULT_STYLE;
          return {
            name: entry.name,
            label: entry.label ?? STATUS_LABELS[entry.name] ?? entry.name,
            count: countByStatus.get(entry.name) ?? 0,
            fillLight: style.fillLight,
            stroke: style.stroke,
            borderType: style.borderType,
          };
        })
      : ALL_STATUSES.map((status) => ({
          name: status.name,
          label: STATUS_LABELS[status.name] ?? status.name,
          count: 0,
          fillLight: status.fillLight,
          stroke: status.stroke,
          borderType: status.borderType,
        }));

  // Population used for percentage chips: the whole in-scope total (all
  // statuses across both halves in status mode; sum of items otherwise).
  let calculatedTotal = 0;
  const totalSource = items ?? byStatus;
  for (const entry of totalSource) {
    if (entry.count > 0) calculatedTotal += entry.count;
  }
  const total = totalCount ?? calculatedTotal;
  const formatChip = (row: LegendRow) => {
    if (!isSampled || total <= 0) return formatNumber(row.count, true);
    const percentage = row.count / total;
    return isItemSampled?.(row.name) === false
      ? formatPercentageWithoutFraction(percentage)
      : formatApproxPercentage(percentage);
  };

  // Show the leading "All" reset entry only in status mode (never with
  // explicit items).
  const showAllItem = !items && allItem && state !== 'error';
  const allItemIsSampled = Boolean(isSampled && !isItemSampled);

  const resolveHref = (row: LegendRow) =>
    row.href ??
    getHref?.(row.name) ??
    toInvocationsHref(baseUrl, row.name, { existingParams: linkParams });
  const breakdownRow = breakdown
    ? rows.find((row) => row.name === breakdown.name)
    : undefined;
  const visibleRows = breakdownRow
    ? rows.filter((row) => row.name !== breakdownRow.name)
    : rows;
  const breakdownTotal = breakdownRow?.count ?? 0;

  return (
    <div className={legendStyles({ isLoading, orientation, class: className })}>
      {leading && (
        <div className="flex items-center px-1.5 py-0.5">{leading}</div>
      )}
      {breakdown && breakdownRow && (
        <div
          className={legendItemStyles({
            state: state === 'error' ? 'error' : state,
            appearance:
              breakdownTotal === 0
                ? 'faded'
                : isDimmed?.(breakdownRow.name)
                  ? 'dimmed'
                  : 'normal',
            orientation,
            compact,
          })}
        >
          <Link
            href={resolveHref(breakdownRow)}
            preserveQueryParams={false}
            variant="secondary"
            className="flex min-w-0 items-center gap-1.5 text-gray-700 no-underline outline-offset-2 outline-blue-600 focus-visible:outline-2"
            disabled={state !== 'success'}
          >
            <span
              className={bulletStyles({
                state,
                borderType: breakdownRow.borderType ? 'dashed' : 'solid',
              })}
              style={{
                backgroundColor: breakdownRow.fillLight,
                borderColor: breakdownRow.stroke,
              }}
            />
            <span className={labelStyles({ orientation, compact })}>
              {breakdownRow.label}
            </span>
            <span className="inline-block shrink-0 rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
              {formatChip(breakdownRow)}
            </span>
          </Link>
          <Popover>
            <PopoverTrigger>
              <Button
                variant="icon"
                aria-label={`Show ${breakdownRow.label} breakdown`}
                className="h-5 w-5 rounded-md p-0"
                disabled={state !== 'success'}
              >
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent placement="bottom" className="w-72">
              <StageBreakdownPopoverContent
                label={breakdownRow.label}
                count={breakdownTotal}
                populationTotal={total}
                items={breakdown.items}
                isLoading={breakdown.isLoading}
                isError={breakdown.isError}
                valuesAreSampled={breakdown.isSampled}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      <AriaGridList
        aria-label="Invocation statuses"
        className="contents"
        layout="grid"
      >
        {showAllItem && (
          <AriaGridListItem
            key="__all__"
            id="__all__"
            textValue={
              allItemIsSampled
                ? 'All statuses (sampled)'
                : `All statuses ${allItem.count}`
            }
            href={state === 'success' ? allItem.href : undefined}
            className={legendItemStyles({
              state: state === 'loading' ? 'loading' : 'success',
              appearance:
                allItem.count === 0
                  ? 'faded'
                  : allItem.dimmed
                    ? 'dimmed'
                    : 'normal',
            })}
          >
            <span className="text-xs text-gray-600">All statuses</span>
            {!allItemIsSampled && (
              <span className="inline-block rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
                {formatNumber(allItem.count, true)}
              </span>
            )}
            <Icon
              name={IconName.ChevronRight}
              className="h-3.5 w-3.5 shrink-0 text-gray-400"
            />
          </AriaGridListItem>
        )}
        {visibleRows.map((row) => {
          const count = row.count;
          const dimmed = isDimmed?.(row.name) ?? false;
          const rowState =
            state === 'success' && isItemLoading?.(row.name)
              ? 'loading'
              : state;
          const borderType = row.borderType ? 'dashed' : 'solid';
          const appearance =
            count === 0 ? 'faded' : dimmed ? 'dimmed' : 'normal';
          if (rowState === 'loading') {
            return (
              <AriaGridListItem
                key={row.name}
                id={row.name}
                textValue={row.label}
                className={legendItemStyles({
                  state: 'loading',
                  appearance,
                  orientation,
                  compact,
                })}
              >
                <div
                  className={bulletStyles({ state: 'loading', borderType })}
                  style={{
                    backgroundColor: row.fillLight,
                    borderColor: row.stroke,
                  }}
                />
                <span
                  className={labelStyles({
                    orientation,
                    compact,
                    tone: 'muted',
                  })}
                >
                  {row.label}
                </span>
                {count > 0 ? (
                  <span className="inline-block shrink-0 rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
                    {formatChip(row)}
                  </span>
                ) : (
                  <span className="shrink-0 animate-pulse rounded bg-gray-200 px-1 py-px text-xs font-medium text-transparent tabular-nums">
                    {formatChip(row)}
                  </span>
                )}
                <Icon
                  name={IconName.ChevronRight}
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                />
              </AriaGridListItem>
            );
          }
          // success or error — render the same skeleton so layout stays
          // constant. For error we drop the count chip (we don't have data),
          // but keep the bullet + label so wrap behavior matches.
          const isErrorState = rowState === 'error';
          return (
            <AriaGridListItem
              key={row.name}
              id={row.name}
              textValue={
                isErrorState ? row.label : `${row.label} ${formatChip(row)}`
              }
              href={isErrorState ? undefined : resolveHref(row)}
              className={legendItemStyles({
                state: isErrorState ? 'error' : 'success',
                appearance,
                orientation,
                compact,
              })}
            >
              <div
                className={bulletStyles({
                  state: isErrorState ? 'error' : 'success',
                  borderType,
                })}
                style={{
                  backgroundColor: row.fillLight,
                  borderColor: row.stroke,
                }}
              />
              <span
                className={labelStyles({
                  orientation,
                  compact,
                  tone: isErrorState ? 'muted' : 'normal',
                })}
              >
                {row.label}
              </span>
              {!isErrorState && (
                <span className="inline-block shrink-0 rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
                  {formatChip(row)}
                </span>
              )}
              {!isErrorState && (
                <Icon
                  name={IconName.ChevronRight}
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                />
              )}
            </AriaGridListItem>
          );
        })}
      </AriaGridList>
    </div>
  );
}
