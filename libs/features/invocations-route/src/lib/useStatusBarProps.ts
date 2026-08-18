import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  TERMINAL_INVOCATION_STATUSES,
  type components,
} from '@restate/data-access/admin-api-spec';
import { hasStatusFilter, type StatusFilter } from './statusFilter';

type StatusBucket = components['schemas']['InvocationStatusSummaryBucketV2'];

export function getRepresentedStatuses(
  statusName: string,
  representedStatuses: string[] | undefined,
  bucketStatuses: string[] | undefined,
) {
  return statusName === 'not-completed' || statusName === 'finished'
    ? TERMINAL_INVOCATION_STATUSES
    : (representedStatuses ?? bucketStatuses);
}

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

  const isDimmed = (statusName: string, representedStatuses?: string[]) => {
    if (!hasStatusFilter(statusFilter)) return false;
    const statuses =
      representedStatuses ?? buckets.get(statusName)?.statuses ?? [];
    if (statuses.length === 0) {
      return buckets.get(statusName)?.isIncluded === false;
    }
    return !statuses.some((status) =>
      statusFilter.operation === 'IN'
        ? statusFilter.value.includes(status)
        : !statusFilter.value.includes(status),
    );
  };

  const getHref = (statusName: string, representedStatuses?: string[]) => {
    const out = new URLSearchParams(searchParams);
    const isNotCompleted = statusName === 'not-completed';
    const statuses = getRepresentedStatuses(
      statusName,
      representedStatuses,
      buckets.get(statusName)?.statuses,
    );
    if (!statuses || statuses.length === 0) {
      return `${baseUrl}/invocations?${out.toString()}`;
    }
    const operation = isNotCompleted ? 'NOT_IN' : 'IN';
    const isCurrentSelection =
      statusFilter?.operation === operation &&
      statusFilter.value.length === statuses.length &&
      statuses.every((status) => statusFilter.value.includes(status));
    if (isCurrentSelection) {
      out.delete('filter_status');
    } else {
      out.set('filter_status', JSON.stringify({ operation, value: statuses }));
    }
    return `${baseUrl}/invocations?${out.toString()}`;
  };

  return { isDimmed, getHref };
}
