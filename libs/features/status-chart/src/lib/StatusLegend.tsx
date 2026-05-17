import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber } from '@restate/util/intl';
import { toInvocationsHref } from '@restate/util/invocation-links';
import { useRestateContext } from '@restate/features/restate-context';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';
import { getOrderedStatuses, type StatusEntry } from './useOrderedStatuses';

export const legendStyles = tv({
  base: 'flex items-start outline-none',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
    orientation: {
      horizontal:
        'max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1',
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
    dimmed: {
      true: 'opacity-40 saturate-50',
      false: '',
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
      success:
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
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
  orientation = 'horizontal',
  half,
  className,
  isDimmed,
  allItem,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
  isError?: boolean;
  linkParams?: URLSearchParams;
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
}) {
  const items = getOrderedStatuses(byStatus);
  const { baseUrl } = useRestateContext();
  const state = isLoading ? 'loading' : isError ? 'error' : 'success';
  const hasData = items.length > 0;
  const fullItems = hasData ? items : ALL_STATUSES;
  const mid = Math.ceil(fullItems.length / 2);
  const displayItems =
    half === 'first'
      ? fullItems.slice(0, mid)
      : half === 'second'
        ? fullItems.slice(mid)
        : fullItems;
  // Only show All on the first half (or when not splitting) so it doesn't
  // duplicate when the legend is rendered in two halves elsewhere.
  const showAllItem = allItem && half !== 'second' && state === 'success';

  return (
    <AriaGridList
      aria-label="Invocation statuses"
      className={legendStyles({ isLoading, orientation, class: className })}
      layout="grid"
    >
      {showAllItem && (
        <AriaGridListItem
          key="__all__"
          id="__all__"
          textValue={`All ${allItem.count}`}
          href={allItem.href}
          className={legendItemStyles({
            state: 'success',
            dimmed: allItem.dimmed,
          })}
        >
          <span className="text-xs text-gray-600">All</span>
          <span className="inline-block rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
            {formatNumber(allItem.count, true)}
          </span>
          <Icon
            name={IconName.ChevronRight}
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
          />
        </AriaGridListItem>
      )}
      {displayItems.map((s) => {
        const count = 'count' in s ? (s as { count: number }).count : 0;
        const dimmed = isDimmed?.(s.name) ?? false;
        const borderType = s.borderType ? 'dashed' : 'solid';
        if (state === 'success' && hasData) {
          return (
            <AriaGridListItem
              key={s.name}
              id={s.name}
              textValue={`${STATUS_LABELS[s.name] ?? s.name} ${count}`}
              href={toInvocationsHref(baseUrl, s.name, {
                existingParams: linkParams,
              })}
              className={legendItemStyles({ state: 'success', dimmed })}
            >
              <div
                className={bulletStyles({ state: 'success', borderType })}
                style={{
                  backgroundColor: s.fillLight,
                  borderColor: s.stroke,
                }}
              />
              <span className="text-xs text-gray-600">
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="inline-block rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums">
                {formatNumber(count, true)}
              </span>
              <Icon
                name={IconName.ChevronRight}
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
              />
            </AriaGridListItem>
          );
        }
        if (state === 'loading') {
          return (
            <AriaGridListItem
              key={s.name}
              id={s.name}
              textValue={STATUS_LABELS[s.name] ?? s.name}
              className={legendItemStyles({ state: 'loading', dimmed })}
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
                {typeof count === 'number' ? formatNumber(count, true) : <br />}
              </span>
              <Icon
                name={IconName.ChevronRight}
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
              />
            </AriaGridListItem>
          );
        }
        return (
          <AriaGridListItem
            key={s.name}
            id={s.name}
            textValue={STATUS_LABELS[s.name] ?? s.name}
            className={legendItemStyles({ state: 'error', dimmed })}
          >
            <div
              className={bulletStyles({ state: 'error', borderType })}
              style={{
                backgroundColor: s.fillLight,
                borderColor: s.stroke,
              }}
            />
            <span className="text-xs text-gray-400">
              {STATUS_LABELS[s.name] ?? s.name}
            </span>
          </AriaGridListItem>
        );
      })}
    </AriaGridList>
  );
}
