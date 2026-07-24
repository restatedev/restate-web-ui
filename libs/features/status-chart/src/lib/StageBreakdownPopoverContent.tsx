import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  formatApproxPercentage,
  formatNumber,
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
  count: number;
  fillLight: string;
  stroke: string;
  borderType?: 'dashed' | number[];
  href: string;
};

export function StageBreakdownPopoverContent({
  label,
  count,
  populationTotal,
  countIsPartial,
  items,
  isLoading,
  isError,
  valuesAreSampled,
}: {
  label: string;
  count: number;
  populationTotal: number;
  countIsPartial?: boolean;
  items: StageBreakdownPopoverItem[];
  isLoading?: boolean;
  isError?: boolean;
  valuesAreSampled?: boolean;
}) {
  return (
    <div className="p-3">
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">
          {countIsPartial && populationTotal > 0 ? (
            <>
              {formatApproxPercentage(count / populationTotal)} of invocations
            </>
          ) : (
            <>
              {formatNumber(count, true)}{' '}
              {formatPlurals(count, {
                one: 'invocation',
                other: 'invocations',
              })}
            </>
          )}
        </div>
      </div>
      {isError ? (
        <div className="rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">
          Could not load this breakdown.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              preserveQueryParams={false}
              variant="secondary"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 no-underline hover:bg-black/5"
              disabled={isLoading}
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
              <span className={countStyles({ loading: isLoading })}>
                {valuesAreSampled && count > 0
                  ? formatApproxPercentage(item.count / count)
                  : formatNumber(item.count, true)}
              </span>
              <Icon
                name={IconName.ChevronRight}
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
