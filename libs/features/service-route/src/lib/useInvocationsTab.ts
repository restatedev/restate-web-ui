import { useListInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  type StatusFilter,
  useInvocationSummary,
} from '@restate/features/invocations-route';
import { useRestateContext } from '@restate/features/restate-context';
import { toFilterParams } from '@restate/util/invocation-links';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export const STATUS_FILTER_QUERY_PARAM = 'filter_status';
const BREAKDOWN_SAMPLE_SIZE = 1_000_000;

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

export function useInvocationsTab(baseFilters: FilterItem[], enabled: boolean) {
  const { baseUrl } = useRestateContext();
  const [searchParams] = useSearchParams();
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
    { filters, sort: { field: 'created_at', order: 'DESC' } },
    {
      enabled,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      onFetchStart: summary.refresh,
    },
  );

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

  const invocationsPageHref = `${baseUrl}/invocations?${toFilterParams(filters).toString()}`;

  return {
    list,
    summary,
    statusFilter,
    countMode,
    setCountMode,
    hrefForStatusFilter,
    invocationsPageHref,
  };
}
