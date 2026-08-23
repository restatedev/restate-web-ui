import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import type { components } from '@restate/data-access/admin-api-spec';
import type { ContentPanelTabs } from '@restate/ui/content-panel';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  buildStatusEntries,
  InvocationsBreakdownTooltipContent,
} from '@restate/features/status-chart';
import {
  countMatchingGlobalStatuses,
  countMatchingStatusBuckets,
  type InvocationPopulationCount,
} from './invocationSummaryMatchCount';
import { hasStatusFilter, type StatusFilter } from './statusFilter';
import { formatNumber } from '@restate/util/intl';

const ALL_TAB_ID = '__all__';
const MULTI_TAB_ID = '__multi__';
const MAX_VISIBLE_SERVICE_TABS = 5;

type StatusBucket = components['schemas']['InvocationStatusSummaryBucketV2'];
type ServiceBucket = components['schemas']['InvocationServiceSummaryBucketV2'];
type InvocationSummary = components['schemas']['SummaryInvocationsV2Response'];
type DeploymentsData = NonNullable<
  ReturnType<typeof useListDeployments>['data']
>;

type ServiceRow = {
  id: string;
  count?: number;
  statusBuckets: StatusBucket[];
};

type TabCount = {
  count?: number;
  accuracy?: InvocationPopulationCount['accuracy'];
};

function serviceRows(
  serviceBuckets: ServiceBucket[] | undefined,
  deploymentsData: DeploymentsData | undefined,
  missingCountsAreUnknown: boolean,
) {
  const services: ServiceRow[] = (serviceBuckets ?? []).map(
    ({ service, count, statusBuckets }) => ({
      id: service,
      count,
      statusBuckets,
    }),
  );
  const seen = new Set(services.map(({ id }) => id));
  for (const service of deploymentsData?.sortedServiceNames ?? []) {
    if (!seen.has(service)) {
      services.push({
        id: service,
        count: missingCountsAreUnknown ? undefined : 0,
        statusBuckets: [],
      });
    }
  }
  return services.sort(
    (a, b) => (b.count ?? -1) - (a.count ?? -1) || a.id.localeCompare(b.id),
  );
}

function selectedServices(
  value: string | null,
  services: ServiceRow[],
): { selectedId: string; label?: string; services?: ServiceRow[] } {
  if (!value) return { selectedId: ALL_TAB_ID };
  try {
    const filter = JSON.parse(value) as {
      operation?: string;
      value?: unknown;
    };
    if (!Array.isArray(filter.value)) return { selectedId: ALL_TAB_ID };
    if (filter.operation === 'IN') {
      if (filter.value.length === 1 && typeof filter.value[0] === 'string') {
        return { selectedId: filter.value[0] };
      }
      const included = new Set(filter.value);
      return {
        selectedId: MULTI_TAB_ID,
        label: `${filter.value.length} services`,
        services: services.filter(({ id }) => included.has(id)),
      };
    }
    if (filter.operation === 'NOT_IN') {
      const excluded = new Set(filter.value);
      return {
        selectedId: MULTI_TAB_ID,
        label: `All except ${filter.value.length}`,
        services: services.filter(({ id }) => !excluded.has(id)),
      };
    }
  } catch {
    return { selectedId: ALL_TAB_ID };
  }
  return { selectedId: ALL_TAB_ID };
}

export function formatServiceTabCount({ count, accuracy = 'exact' }: TabCount) {
  if (count === undefined || (accuracy === 'estimate' && count === 0)) {
    return undefined;
  }
  return `${formatNumber(count, true)}${accuracy === 'lower-bound' ? '+' : ''}`;
}

function tabLabel(
  label: string,
  total: TabCount,
  isLoading: boolean,
): ReactNode {
  const formattedTotal = formatServiceTabCount(total);
  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate [[role=tab]_&]:max-w-[12ch]" title={label}>
        {label}
      </span>
      {isLoading ? (
        <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
      ) : formattedTotal ? (
        <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium whitespace-nowrap text-zinc-500 tabular-nums">
          {formattedTotal}
        </span>
      ) : null}
    </span>
  );
}

function serviceHref(
  baseUrl: string,
  current: URLSearchParams,
  service?: string,
) {
  const params = new URLSearchParams(current);
  if (service) {
    params.set(
      'filter_target_service_name',
      JSON.stringify({ operation: 'IN', value: [service] }),
    );
  } else {
    params.delete('filter_target_service_name');
  }
  const query = params.toString();
  return `${baseUrl}/invocations${query ? `?${query}` : ''}`;
}

function serviceStatusHref(
  baseUrl: string,
  current: URLSearchParams,
  service: string,
  statuses: StatusBucket['statuses'],
) {
  const params = new URLSearchParams(current);
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [service] }),
  );
  params.set(
    'filter_status',
    JSON.stringify({ operation: 'IN', value: statuses }),
  );
  const query = params.toString();
  return `${baseUrl}/invocations${query ? `?${query}` : ''}`;
}

function serviceTotalHref(
  baseUrl: string,
  current: URLSearchParams,
  service: string,
) {
  const params = new URLSearchParams(current);
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [service] }),
  );
  params.delete('filter_status');
  const query = params.toString();
  return `${baseUrl}/invocations${query ? `?${query}` : ''}`;
}

function serviceTabLabel(
  service: ServiceRow,
  baseUrl: string,
  searchParams: URLSearchParams,
  matching: number | undefined,
  isFiltered: boolean,
  matchingIsPartial: boolean,
  isLoading: boolean,
  countAccuracy: TabCount['accuracy'],
  currentCount?: InvocationPopulationCount,
) {
  const label = tabLabel(
    service.id,
    {
      count: service.count,
      accuracy: countAccuracy,
    },
    isLoading,
  );
  if (isLoading || service.count === undefined) return label;

  const buckets = new Map(
    service.statusBuckets.map((bucket) => [bucket.key, bucket]),
  );
  const statuses = buildStatusEntries(
    service.statusBuckets.map((bucket) => ({
      status: bucket.key,
      label: bucket.label,
      count: bucket.count,
    })),
  );
  return (
    <HoverTooltip
      content={
        <InvocationsBreakdownTooltipContent
          title={
            <div className="text-base! leading-7 font-medium text-gray-300!">
              {service.id}
            </div>
          }
          total={service.count}
          filteredTotal={
            isFiltered ||
            (currentCount !== undefined && currentCount.count !== service.count)
              ? (currentCount?.count ?? matching)
              : undefined
          }
          totalLink={serviceTotalHref(baseUrl, searchParams, service.id)}
          statuses={statuses}
          getStatusLink={(statusName) =>
            serviceStatusHref(
              baseUrl,
              searchParams,
              service.id,
              buckets.get(statusName)?.statuses ?? [],
            )
          }
          isStatusDimmed={(statusName) =>
            buckets.get(statusName)?.isIncluded === false
          }
          isSampled={matchingIsPartial}
        />
      }
      size="lg"
    >
      {label}
    </HoverTooltip>
  );
}

export function useServiceTabs(
  summary: InvocationSummary | undefined,
  deploymentsData: DeploymentsData | undefined,
  statusFilter: StatusFilter,
  isLoading = false,
  currentCount?: InvocationPopulationCount,
): ContentPanelTabs {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const summaryCountsArePartial = Boolean(
    summary?.mode === 'sampled' || summary?.isPartial,
  );
  const services = useMemo(
    () =>
      serviceRows(
        summary?.serviceBuckets,
        deploymentsData,
        summaryCountsArePartial,
      ),
    [summary?.serviceBuckets, deploymentsData, summaryCountsArePartial],
  );
  const selection = selectedServices(
    searchParams.get('filter_target_service_name'),
    services,
  );
  const total: TabCount = {
    count:
      summary && !(summaryCountsArePartial && summary.total === 0)
        ? summary.total
        : undefined,
    accuracy: summary?.stageCountsArePartial ? 'estimate' : 'exact',
  };
  const isFiltered = hasStatusFilter(statusFilter);
  const displayedCurrentCount =
    currentCount &&
    !(currentCount.accuracy === 'estimate' && currentCount.count === 0) &&
    (isFiltered || currentCount.accuracy === 'exact')
      ? currentCount
      : undefined;
  const populationStatuses =
    summary?.stageBuckets.flatMap(({ statuses }) => statuses) ?? [];
  const globalMatch = isFiltered
    ? summary
      ? countMatchingGlobalStatuses(summary, statusFilter)
      : undefined
    : undefined;
  const matchingIsPartial = globalMatch?.isPartial ?? false;
  const matchingCount = (subset: ServiceRow[]) => {
    if (!isFiltered) return undefined;
    let count = 0;
    for (const service of subset) {
      if (service.count === undefined) return undefined;
      if (service.count === 0) continue;
      const serviceCount = countMatchingStatusBuckets(
        service.statusBuckets,
        populationStatuses,
        statusFilter,
      );
      if (serviceCount === undefined) return undefined;
      count += serviceCount;
    }
    return matchingIsPartial && count === 0 ? undefined : count;
  };
  const items = [
    {
      id: ALL_TAB_ID,
      label: tabLabel('All services', total, isLoading),
      href: serviceHref(baseUrl, searchParams),
    },
    ...(selection.services
      ? [
          {
            id: MULTI_TAB_ID,
            label: tabLabel(
              selection.label ?? 'Selected services',
              {
                count: selection.services.every(
                  ({ count }) => count !== undefined,
                )
                  ? selection.services.reduce(
                      (sum, service) => sum + (service.count ?? 0),
                      0,
                    )
                  : undefined,
                accuracy: total.accuracy,
              },
              isLoading,
            ),
          },
        ]
      : []),
    ...services.map((service) => ({
      id: service.id,
      label: serviceTabLabel(
        service,
        baseUrl,
        searchParams,
        matchingCount([service]),
        isFiltered,
        matchingIsPartial,
        isLoading,
        total.accuracy,
        selection.selectedId === service.id ? displayedCurrentCount : undefined,
      ),
      href: serviceHref(baseUrl, searchParams, service.id),
    })),
  ];

  return {
    items,
    maxVisible: MAX_VISIBLE_SERVICE_TABS,
    selectedId: selection.selectedId,
  };
}
