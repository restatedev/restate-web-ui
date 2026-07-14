import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import type { components } from '@restate/data-access/admin-api-spec';
import { hasStatusFilter, type StatusFilter } from './statusFilter';

type StatusBucket = components['schemas']['InvocationStatusSummaryBucketV2'];

/**
 * Props for StatusSummaryBar + StatusLegend driven by response-defined
 * buckets and the URL's status filter.
 *
 * Click semantics encoded in `getHref`:
 *   * Clicking the bucket's exact IN selection toggles it off.
 *   * Otherwise the filter is replaced with the statuses represented by the
 *     bucket, including coarse groups such as Processing.
 */
export function useStatusBarProps(
  statusFilter: StatusFilter,
  statusBuckets: StatusBucket[],
) {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const buckets = new Map(statusBuckets.map((bucket) => [bucket.key, bucket]));

  const isDimmed = (statusName: string) =>
    hasStatusFilter(statusFilter) &&
    buckets.get(statusName)?.isIncluded === false;

  const getHref = (statusName: string) => {
    const out = new URLSearchParams(searchParams);
    const statuses = buckets.get(statusName)?.statuses ?? [];
    const isCurrentSelection =
      statusFilter?.operation === 'IN' &&
      statusFilter.value.length === statuses.length &&
      statuses.every((status) => statusFilter.value.includes(status));
    if (isCurrentSelection) {
      out.delete('filter_status');
    } else {
      out.set(
        'filter_status',
        JSON.stringify({ operation: 'IN', value: statuses }),
      );
    }
    return `${baseUrl}/invocations?${out.toString()}`;
  };

  return { isDimmed, getHref };
}
