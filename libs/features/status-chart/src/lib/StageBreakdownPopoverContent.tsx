import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  formatApproxPercentage,
  formatNumber,
  formatPercentage,
  formatPlurals,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const bulletStyles = tv({
  base: 'h-3 w-3 shrink-0 rounded-full border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
    loading: {
      true: 'animate-pulse opacity-40',
      false: '',
    },
  },
});

const countStyles = tv({
  base: 'ml-auto inline-block shrink-0 rounded-xs bg-gray-50/60 px-1 py-px text-xs font-medium text-gray-500 tabular-nums',
  variants: {
    loading: {
      true: 'animate-pulse bg-gray-200 text-transparent',
      false: '',
    },
  },
});

export type StageBreakdownPopoverItem = {
  name: string;
  label: string;
  count?: number;
  fillLight: string;
  stroke: string;
  borderType?: 'dashed' | number[];
  href: string;
};

export function StageBreakdownPopoverContent({
  label,
  count,
  countIsPartial,
  countIsUnknown,
  items,
  isLoading,
  isError,
  valuesAreSampled,
}: {
  label: string;
  count: number;
  countIsPartial?: boolean;
  countIsUnknown?: boolean;
  items: StageBreakdownPopoverItem[];
  isLoading?: boolean;
  isError?: boolean;
  valuesAreSampled?: boolean;
}) {
  return (
    <div className="p-3">
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {isLoading ? (
          <span
            className="mt-1 inline-block h-3 w-16 animate-pulse rounded bg-gray-200"
            aria-label={`${label} count loading`}
          />
        ) : !countIsUnknown ? (
          <div className="text-xs text-gray-500">
            {countIsPartial && '~'}
            {formatNumber(count, true)}{' '}
            {formatPlurals(count, {
              one: 'invocation',
              other: 'invocations',
            })}
          </div>
        ) : null}
      </div>
      {isError && (
        <div className="rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">
          Could not load this breakdown.
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const percentage =
            item.count === undefined || isLoading
              ? undefined
              : count > 0
                ? valuesAreSampled
                  ? formatApproxPercentage(item.count / count)
                  : formatPercentage(item.count / count)
                : '0%';
          return (
            <Link
              key={item.name}
              href={item.href}
              preserveQueryParams={false}
              variant="secondary"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 no-underline hover:bg-black/5"
              aria-label={
                percentage
                  ? `${item.label}: ${percentage} of ${label}`
                  : item.label
              }
            >
              <span
                className={bulletStyles({
                  borderType: item.borderType ? 'dashed' : 'solid',
                  loading: isLoading,
                })}
                style={{
                  backgroundColor: item.fillLight,
                  borderColor: item.stroke,
                }}
              />
              <span>{item.label}</span>
              {percentage && (
                <span className={countStyles({ loading: isLoading })}>
                  {percentage}
                </span>
              )}
              <Icon
                name={IconName.ChevronRight}
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
