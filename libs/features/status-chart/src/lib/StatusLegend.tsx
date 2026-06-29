import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import type { ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber, formatApproxPercentage } from '@restate/util/intl';
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
  allItem,
  isSampled,
  leading,
  items,
  compact = true,
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
}) {
  const { baseUrl } = useRestateContext();
  const state = isLoading ? 'loading' : isError ? 'error' : 'success';

  // Counts looked up from byStatus (status mode); missing entries render as 0.
  const countByStatus = new Map<string, number>();
  for (const entry of byStatus) {
    if (entry.count > 0) countByStatus.set(entry.name, entry.count);
  }

  // Always iterate the canonical status list so the legend's wrap count and
  // height stay constant regardless of how many statuses are present in the
  // data — unless explicit `items` are supplied.
  const rows: LegendRow[] = items
    ? items
    : ALL_STATUSES.map((s) => ({
        name: s.name,
        label: STATUS_LABELS[s.name] ?? s.name,
        count: countByStatus.get(s.name) ?? 0,
        fillLight: s.fillLight,
        stroke: s.stroke,
        borderType: s.borderType,
      }));

  // Population used for percentage chips: the whole in-scope total (all
  // statuses across both halves in status mode; sum of items otherwise).
  let total = 0;
  const totalSource = items ?? byStatus;
  for (const entry of totalSource) {
    if (entry.count > 0) total += entry.count;
  }
  const formatChip = (count: number) =>
    isSampled && total > 0
      ? formatApproxPercentage(count / total)
      : formatNumber(count, true);

  // Show the leading "All" reset entry only in status mode (never with
  // explicit items).
  const showAllItem = !items && allItem && state === 'success';

  const resolveHref = (row: LegendRow) =>
    row.href ??
    getHref?.(row.name) ??
    toInvocationsHref(baseUrl, row.name, { existingParams: linkParams });

  return (
    <div className={legendStyles({ isLoading, orientation, class: className })}>
      {leading && (
        <div className="flex items-center px-1.5 py-0.5">{leading}</div>
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
              isSampled ? 'All statuses (sampled)' : `All statuses ${allItem.count}`
            }
            href={allItem.href}
            className={legendItemStyles({
              state: 'success',
              appearance:
                allItem.count === 0
                  ? 'faded'
                  : allItem.dimmed
                    ? 'dimmed'
                    : 'normal',
            })}
          >
            <span className="text-xs text-gray-600">All statuses</span>
            {!isSampled && (
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
        {rows.map((row) => {
          const count = row.count;
          const dimmed = isDimmed?.(row.name) ?? false;
          const borderType = row.borderType ? 'dashed' : 'solid';
          const appearance =
            count === 0 ? 'faded' : dimmed ? 'dimmed' : 'normal';
          if (state === 'loading') {
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
                <span className="shrink-0 animate-pulse rounded bg-gray-200 px-1 py-px text-xs font-medium text-transparent tabular-nums">
                  {formatChip(count)}
                </span>
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
          const isErrorState = state === 'error';
          return (
            <AriaGridListItem
              key={row.name}
              id={row.name}
              textValue={
                isErrorState ? row.label : `${row.label} ${formatChip(count)}`
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
                  {formatChip(count)}
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
