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
      vertical: 'flex-col gap-0.5',
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

export function StatusLegend({
  byStatus,
  isLoading,
  isError,
  linkParams,
  getHref,
  orientation = 'horizontal',
  half,
  className,
  isDimmed,
  allItem,
  isSampled,
  leading,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
  isError?: boolean;
  linkParams?: URLSearchParams;
  // Caller-driven per-status href builder. When provided, takes precedence
  // over the internal `toInvocationsHref(linkParams)` construction — used by
  // the invocations route to preserve sibling filters (e.g.,
  // filter_target_service_name) that `toInvocationsHref` would strip.
  getHref?: (statusName: string) => string;
  orientation?: 'horizontal' | 'vertical';
  half?: 'first' | 'second';
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
}) {
  const { baseUrl } = useRestateContext();
  const state = isLoading ? 'loading' : isError ? 'error' : 'success';
  // Always iterate the canonical status list so the legend's wrap count and
  // height stay constant regardless of how many statuses are present in the
  // data. Counts are looked up from byStatus; missing entries render as 0.
  const countByStatus = new Map<string, number>();
  let total = 0;
  for (const entry of byStatus) {
    if (entry.count > 0) {
      countByStatus.set(entry.name, entry.count);
      total += entry.count;
    }
  }
  const formatChip = (count: number) =>
    isSampled && total > 0
      ? formatApproxPercentage(count / total)
      : formatNumber(count, true);
  const mid = Math.ceil(ALL_STATUSES.length / 2);
  const displayItems =
    half === 'first'
      ? ALL_STATUSES.slice(0, mid)
      : half === 'second'
        ? ALL_STATUSES.slice(mid)
        : ALL_STATUSES;
  // Only show All on the first half (or when not splitting) so it doesn't
  // duplicate when the legend is rendered in two halves elsewhere.
  const showAllItem = allItem && half !== 'second' && state === 'success';

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
            textValue={isSampled ? 'All (sampled)' : `All ${allItem.count}`}
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
            <span className="text-xs text-gray-600">All</span>
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
        {displayItems.map((s) => {
          const count = countByStatus.get(s.name) ?? 0;
          const dimmed = isDimmed?.(s.name) ?? false;
          const borderType = s.borderType ? 'dashed' : 'solid';
          const appearance =
            count === 0 ? 'faded' : dimmed ? 'dimmed' : 'normal';
          if (state === 'loading') {
            return (
              <AriaGridListItem
                key={s.name}
                id={s.name}
                textValue={STATUS_LABELS[s.name] ?? s.name}
                className={legendItemStyles({ state: 'loading', appearance })}
              >
                <div
                  className={bulletStyles({ state: 'loading', borderType })}
                  style={{
                    backgroundColor: s.fillLight,
                    borderColor: s.stroke,
                  }}
                />
                <span className="text-xs text-gray-400">
                  {STATUS_LABELS[s.name] ?? s.name}
                </span>
                <span className="animate-pulse rounded bg-gray-200 px-1 py-px text-xs font-medium text-transparent tabular-nums">
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
          const isError = state === 'error';
          return (
            <AriaGridListItem
              key={s.name}
              id={s.name}
              textValue={
                isError
                  ? (STATUS_LABELS[s.name] ?? s.name)
                  : `${STATUS_LABELS[s.name] ?? s.name} ${formatChip(count)}`
              }
              href={
                isError
                  ? undefined
                  : (getHref?.(s.name) ??
                    toInvocationsHref(baseUrl, s.name, {
                      existingParams: linkParams,
                    }))
              }
              className={legendItemStyles({
                state: isError ? 'error' : 'success',
                appearance,
              })}
            >
              <div
                className={bulletStyles({
                  state: isError ? 'error' : 'success',
                  borderType,
                })}
                style={{
                  backgroundColor: s.fillLight,
                  borderColor: s.stroke,
                }}
              />
              <span
                className={
                  isError ? 'text-xs text-gray-400' : 'text-xs text-gray-600'
                }
              >
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              {!isError && (
                <span className="inline-block rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
                  {formatChip(count)}
                </span>
              )}
              {!isError && (
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
