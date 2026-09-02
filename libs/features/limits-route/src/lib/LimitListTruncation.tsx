import { formatNumber } from '@restate/util/intl';

export function LimitListTruncation({
  label,
  totalItems,
  hasMore,
}: {
  label: string;
  totalItems: number;
  hasMore?: boolean;
}) {
  if (!hasMore) return null;

  return (
    <div className="w-full pt-3 pr-4 pb-2 pl-2 text-xs text-gray-500/80">
      Showing the first{' '}
      <span className="font-medium text-gray-500 tabular-nums">
        {formatNumber(totalItems)}
      </span>{' '}
      {label}. More match this query.
    </div>
  );
}
