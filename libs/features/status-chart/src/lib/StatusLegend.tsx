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
  base: 'flex min-h-11 max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 outline-none',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

const legendItemStyles = tv({
  base: 'flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 no-underline outline-offset-2 outline-blue-600 hover:bg-black/5 focus-visible:outline-2',
  variants: {
    isEmpty: {
      true: 'opacity-50',
      false: '',
    },
  },
});

const ALL_STATUSES = STATUS_ORDER.map((name) => ({
  name,
  ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
}));

export function StatusLegend({
  byStatus,
  isLoading,
  isError,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
  isError?: boolean;
}) {
  const items = getOrderedStatuses(byStatus);
  const { baseUrl } = useRestateContext();
  const state = isLoading ? 'loading' : isError ? 'error' : 'success';
  const countsByName = new Map(items.map((s) => [s.name, s.count]));
  const displayItems = ALL_STATUSES.map((s) => ({
    ...s,
    count: countsByName.get(s.name) ?? 0,
  }));

  return (
    <AriaGridList
      aria-label="Invocation statuses"
      className={legendStyles({ isLoading })}
      layout="grid"
    >
      {displayItems.map((s) => {
        if (state === 'success') {
          return (
            <AriaGridListItem
              key={s.name}
              id={s.name}
              textValue={`${STATUS_LABELS[s.name] ?? s.name} ${s.count}`}
              href={toInvocationsHref(baseUrl, s.name)}
              className={legendItemStyles({ isEmpty: s.count === 0 })}
            >
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: s.fillLight,
                  border: `1.5px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35)',
                }}
              />
              <span className="text-xs text-gray-500">
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {formatNumber(s.count, true)}
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
              className="flex cursor-default items-center gap-1.5 px-1.5 py-0.5 outline-none"
            >
              <div
                className="h-3 w-3 shrink-0 rounded-full opacity-40"
                style={{
                  backgroundColor: s.fillLight,
                  border: `1.5px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
                }}
              />
              <span className="text-xs text-gray-400">
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="h-3 w-6 animate-pulse rounded bg-gray-200" />
            </AriaGridListItem>
          );
        }
        return (
          <AriaGridListItem
            key={s.name}
            id={s.name}
            textValue={STATUS_LABELS[s.name] ?? s.name}
            className="flex cursor-default items-center gap-1.5 px-1.5 py-0.5 opacity-50 outline-none"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: s.fillLight,
                border: `1.5px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
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
