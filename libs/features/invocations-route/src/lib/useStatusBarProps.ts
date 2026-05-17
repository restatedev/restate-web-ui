import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  FAILED_SUBSTATES,
  hasStatusFilter,
  isSingleStatusSelection,
  isStatusInFilter,
  type StatusFilter,
} from './statusFilter';

/**
 * Props for StatusSummaryBar + StatusLegend driven off the URL's status
 * filter. Returns `isDimmed` (per-status fade signal) and `getHref` (per-segment
 * click target). Keeps the bar/legend components presentation-only.
 *
 * Click semantics encoded in `getHref`:
 *   * Clicking the SINGLE IN selection → toggles off by deleting the key.
 *   * Otherwise → REPLACE with IN [statusName]. Clicking a status while a
 *     NOT_IN filter is active narrows to that single status instead of
 *     trying to round-trip the negation.
 */
export function useStatusBarProps(statusFilter: StatusFilter) {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();

  const isDimmed = (statusName: string) =>
    hasStatusFilter(statusFilter) &&
    !isStatusInFilter(statusFilter, statusName);

  const getHref = (statusName: string) => {
    const out = new URLSearchParams(searchParams);
    if (isSingleStatusSelection(statusFilter, statusName)) {
      out.delete('filter_status');
    } else {
      const value = statusName === 'failed' ? FAILED_SUBSTATES : [statusName];
      out.set('filter_status', JSON.stringify({ operation: 'IN', value }));
    }
    return `${baseUrl}/invocations?${out.toString()}`;
  };

  return { isDimmed, getHref };
}
