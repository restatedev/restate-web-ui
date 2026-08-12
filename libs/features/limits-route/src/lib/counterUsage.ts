import type { UserLimitRow } from '@restate/data-access/admin-api-hooks';

type CounterUsage = Pick<UserLimitRow, 'usage' | 'concurrency_limit'>;

export function getCounterUsageRatio({
  usage,
  concurrency_limit: limit,
}: CounterUsage) {
  if (limit == null) return undefined;
  if (limit <= 0) return (usage ?? 0) > 0 ? Number.POSITIVE_INFINITY : 0;
  return (usage ?? 0) / limit;
}
