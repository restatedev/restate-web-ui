import { useListInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  deriveSortFromUrl,
  doInvocationCountsDisagree,
  formatServiceTabBadge,
  getListRowCounts,
  getResultsNoticeMessage,
  resolveInvocationPopulationCount,
  setSort,
  SORT_NONE,
  SORT_QUERY_PREFIX,
  type SortSelection,
  type StatusFilter,
  useInvocationFilterSchema,
  useInvocationSummary,
} from '@restate/features/invocations-route';
import { useRestateContext } from '@restate/features/restate-context';
import { toFilterParams } from '@restate/util/invocation-links';
import { formatNumber } from '@restate/util/intl';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export const STATUS_FILTER_QUERY_PARAM = 'filter_status';
const BREAKDOWN_SAMPLE_SIZE = 1_000_000;
const NO_SORT: SortSelection = { field: SORT_NONE, order: 'DESC' };

function parseStatusFilter(value: string | null): StatusFilter {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as {
      operation?: 'IN' | 'NOT_IN';
      value?: string[];
    };
    if (
      (parsed.operation === 'IN' || parsed.operation === 'NOT_IN') &&
      Array.isArray(parsed.value) &&
      parsed.value.length > 0
    ) {
      return {
        field: 'status',
        type: 'STRING_LIST',
        operation: parsed.operation,
        value: parsed.value,
      } as StatusFilter;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function useInvocationsTab(
  baseFilters: FilterItem[],
  { enabled, isActive }: { enabled: boolean; isActive: boolean },
) {
  const { baseUrl } = useRestateContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortParams = deriveSortFromUrl(searchParams, NO_SORT);
  const sort =
    sortParams.field === SORT_NONE
      ? undefined
      : { field: sortParams.field, order: sortParams.order };
  const setSortParams: Dispatch<SetStateAction<SortSelection>> = (action) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const selection =
          typeof action === 'function'
            ? action(deriveSortFromUrl(prev, NO_SORT))
            : action;
        next.delete(SORT_QUERY_PREFIX + 'field');
        next.delete(SORT_QUERY_PREFIX + 'order');
        if (selection.field !== SORT_NONE) {
          setSort(next, { field: selection.field, order: selection.order });
        }
        return next;
      },
      { preventScrollReset: true },
    );
  };
  const statusParam = searchParams.get(STATUS_FILTER_QUERY_PARAM);
  const statusFilter = useMemo(
    () => parseStatusFilter(statusParam),
    [statusParam],
  );
  const filters = useMemo<FilterItem[]>(
    () => [
      ...baseFilters,
      ...(statusFilter ? [statusFilter as FilterItem] : []),
    ],
    [baseFilters, statusFilter],
  );
  const [countMode, setCountMode] = useState<'estimate' | 'exact'>('estimate');
  const summary = useInvocationSummary({
    filters,
    countMode,
    breakdownSampleSize: BREAKDOWN_SAMPLE_SIZE,
    enabled,
  });
  const list = useListInvocationsV2(
    { filters, sort },
    {
      enabled: enabled && isActive,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      onFetchStart: summary.refresh,
    },
  );

  const { schema } = useInvocationFilterSchema();
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  useEffect(() => {
    setSelectedIds(new Set());
  }, [list.isFetching]);
  const rows = list.data?.rows;
  const selectedInvocationIds = useMemo(
    () =>
      new Set(
        (rows ?? [])
          .filter(({ id }) => selectedIds.has(id))
          .map(({ id }) => id),
      ),
    [rows, selectedIds],
  );
  const { statusChangedCount, matchingRowCount } = useMemo(
    () => getListRowCounts(list.data),
    [list.data],
  );
  const listSnapshot = {
    listIsAvailable: list.data != null,
    listRowCount: matchingRowCount,
    listLimit: list.data?.limit ?? 0,
    listIsPartial: Boolean(list.data?.isPartial),
  };
  const total = resolveInvocationPopulationCount({
    summaryMatchCount: summary.matchingCount,
    ...listSnapshot,
  });
  const countsDisagree = doInvocationCountsDisagree({
    isSettled:
      !list.isFetching && !summary.isFetching && !list.error && !summary.isError,
    statusChangedCount,
    summaryMatchCount: summary.matchingCount,
    ...listSnapshot,
  });
  const resultsNotice = getResultsNoticeMessage({
    countsDisagree,
    listIsSettled: !list.isFetching && !list.error,
    isPartial: listSnapshot.listIsPartial,
    statusChangedCount,
  });
  const totalLabel = `${total.accuracy === 'estimate' ? '~' : ''}${formatNumber(total.count, true)}${total.accuracy === 'lower-bound' ? '+' : ''}`;

  const hasCompletedStage = summary.byStage.some(
    ({ name }) => name === 'finished',
  );
  const populationCount = hasCompletedStage
    ? summary.byStage.reduce((sum, { count }) => sum + count, 0)
    : undefined;
  const populationIsEstimate = Boolean(summary.data?.stageCountsArePartial);
  const isStatusFiltered = Boolean(statusFilter);
  const matchingCount = summary.matchingCount?.count;
  const matchingIsEstimate = Boolean(summary.matchingCount?.isPartial);
  const tabBadge = useMemo(
    () =>
      formatServiceTabBadge(
        {
          count: populationCount,
          accuracy: populationIsEstimate ? 'estimate' : 'exact',
        },
        isStatusFiltered
          ? {
              count: matchingCount,
              accuracy: matchingIsEstimate ? 'estimate' : 'exact',
            }
          : undefined,
      ),
    [
      populationCount,
      populationIsEstimate,
      isStatusFiltered,
      matchingCount,
      matchingIsEstimate,
    ],
  );
  const isTabBadgeLoading =
    summary.isLoading ||
    (!hasCompletedStage && summary.isBreakdownLoading('finished'));

  const hrefForStatusFilter = (next: StatusFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next && next.value.length > 0) {
      params.set(
        STATUS_FILTER_QUERY_PARAM,
        JSON.stringify({ operation: next.operation, value: next.value }),
      );
    } else {
      params.delete(STATUS_FILTER_QUERY_PARAM);
    }
    return `?${params.toString()}`;
  };

  const invocationsPageParams = toFilterParams(filters);
  if (sort) setSort(invocationsPageParams, sort);
  const invocationsPageHref = `${baseUrl}/invocations?${invocationsPageParams.toString()}`;

  return {
    list,
    summary,
    statusFilter,
    sort,
    sortParams,
    setSortParams,
    countMode,
    setCountMode,
    hrefForStatusFilter,
    invocationsPageHref,
    filters,
    schema,
    selectedInvocationIds,
    setSelectedIds,
    total: total.count,
    countsDisagree,
    resultsNotice,
    totalLabel,
    tabBadge,
    isTabBadgeLoading,
  };
}
