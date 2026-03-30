import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
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
  base: 'flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 outline-none',
  variants: {
    isLoading: {
      true: 'animate-pulse',
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
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
}) {
  const items = getOrderedStatuses(byStatus);
  const { baseUrl } = useRestateContext();
  const hasData = items.length > 0;
  const displayItems = hasData ? items : ALL_STATUSES;

  return (
    <AriaGridList
      aria-label="Invocation statuses"
      className={legendStyles({ isLoading })}
      layout="grid"
    >
      {displayItems.map((s) => {
        const count = 'count' in s ? (s as { count: number }).count : 0;
        return hasData ? (
          <AriaGridListItem
            key={s.name}
            id={s.name}
            textValue={`${STATUS_LABELS[s.name] ?? s.name} ${count}`}
            href={toInvocationsHref(baseUrl, s.name)}
            className="flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 no-underline outline-offset-2 outline-blue-600 hover:bg-black/5 focus-visible:outline-2"
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
              {formatNumber(count, true)}
            </span>
          </AriaGridListItem>
        ) : (
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
      })}
    </AriaGridList>
  );
}
