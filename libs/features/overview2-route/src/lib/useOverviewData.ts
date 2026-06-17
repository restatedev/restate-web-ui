import { useCallback, useMemo, useRef } from 'react';
import {
  useListDrainedDeployments,
  useListDeployments,
  useListServices,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import {
  checkSlaThresholds,
  getServiceIssues,
  type ServiceIssue,
} from '@restate/features/system-health';
import { handlerIssuesKey } from './sortHandlers';

const MIN_OVERVIEW_REFETCH_INTERVAL = 3_000;
const MAX_OVERVIEW_REFETCH_INTERVAL = 60_000;
const OVERVIEW_REFETCH_DURATION_MULTIPLIER = 10;

function getOverviewRefetchInterval(summaryFetchDuration: number) {
  return Math.min(
    MAX_OVERVIEW_REFETCH_INTERVAL,
    Math.max(
      MIN_OVERVIEW_REFETCH_INTERVAL,
      summaryFetchDuration * OVERVIEW_REFETCH_DURATION_MULTIPLIER,
    ),
  );
}

export function useOverviewData(range?: string) {
  const overviewRefetchIntervalRef = useRef(MIN_OVERVIEW_REFETCH_INTERVAL);
  const overviewRefetchInterval = useCallback(
    () => overviewRefetchIntervalRef.current,
    [],
  );
  const updateOverviewRefetchInterval = useCallback(
    (summaryFetchDuration: number) => {
      overviewRefetchIntervalRef.current =
        getOverviewRefetchInterval(summaryFetchDuration);
    },
    [],
  );
  const {
    data: { sortedServiceNames, deployments: deploymentsMap } = {},
    isFetched,
    isFetching,
    isError,
    error,
  } = useListDeployments();

  const { data: servicesMap } = useListServices(sortedServiceNames);
  const {
    data: rawSummaryData,
    isPending: isSummaryPending,
    isPlaceholderData: isSummaryPlaceholder,
    isError: isSummaryError,
    error: summaryError,
    queryKey: summaryQueryKey,
  } = useSummaryInvocations([], {
    sampled: false,
    range,
    refetchInterval: overviewRefetchInterval,
    onFetchDuration: updateOverviewRefetchInterval,
  });

  const isSummaryLoading = isSummaryPending || isSummaryPlaceholder;
  const {
    data: drainedDeploymentIds = new Set(),
    isPending: isDeploymentStatusLoading,
  } = useListDrainedDeployments();
  const summaryData = isSummaryError ? undefined : rawSummaryData;
  const { isNew, isVersionGte } = useRestateContext();

  const byStatus = summaryData?.byStatus ?? [];
  const byServiceAndStatus = summaryData?.byServiceAndStatus ?? [];
  const totalCount = summaryData?.totalCount ?? 0;
  const appliedFilters = summaryData?.appliedFilters ?? [];

  const { invocationCounts, serviceStatusCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    const statusCounts = new Map<string, Map<string, number>>();
    for (const entry of byServiceAndStatus) {
      counts.set(entry.service, (counts.get(entry.service) ?? 0) + entry.count);
      let statusMap = statusCounts.get(entry.service);
      if (!statusMap) {
        statusMap = new Map();
        statusCounts.set(entry.service, statusMap);
      }
      statusMap.set(
        entry.status,
        (statusMap.get(entry.status) ?? 0) + entry.count,
      );
    }
    return { invocationCounts: counts, serviceStatusCounts: statusCounts };
  }, [byServiceAndStatus]);

  const handlerInvocationCounts = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const entry of summaryData?.byServiceAndHandler ?? []) {
      let perService = map.get(entry.service);
      if (!perService) {
        perService = new Map();
        map.set(entry.service, perService);
      }
      perService.set(
        entry.handler,
        (perService.get(entry.handler) ?? 0) + entry.count,
      );
    }
    return map;
  }, [summaryData?.byServiceAndHandler]);

  const serviceIssuesMap = useMemo(() => {
    const map = new Map<string, ServiceIssue[]>();
    for (const service of servicesMap?.values() ?? []) {
      const deployment = deploymentsMap?.get(service.deployment_id);
      const statusCounts = serviceStatusCounts.get(service.name) ?? new Map();
      const issues = getServiceIssues({
        service,
        deployment,
        isVersionGte,
        statusCounts,
      });
      if (issues.length > 0) {
        map.set(service.name, issues);
      }
    }
    return map;
  }, [servicesMap, deploymentsMap, serviceStatusCounts, isVersionGte]);

  const handlerIssuesMap = useMemo(() => {
    const handlerStatusCounts = new Map<string, Map<string, number>>();
    for (const entry of summaryData?.byServiceAndHandlerAndStatus ?? []) {
      const key = handlerIssuesKey(entry.service, entry.handler);
      let counts = handlerStatusCounts.get(key);
      if (!counts) {
        counts = new Map();
        handlerStatusCounts.set(key, counts);
      }
      counts.set(entry.status, (counts.get(entry.status) ?? 0) + entry.count);
    }
    const map = new Map<string, ServiceIssue[]>();
    for (const [key, statusCounts] of handlerStatusCounts) {
      const issues = checkSlaThresholds(statusCounts);
      if (issues.length > 0) {
        map.set(key, issues);
      }
    }
    return map;
  }, [summaryData?.byServiceAndHandlerAndStatus]);

  const hasData = isNew || deploymentsMap !== undefined;
  const isInitialLoading = !isFetched && !isNew;
  // "bare" = fetched (or attempted) but never got data — typically after an
  // initial-load error. No empty-state placeholder yet because we don't know
  // whether there are deployments.
  const isBare = !isInitialLoading && !hasData;
  const isEmpty =
    !isInitialLoading &&
    hasData &&
    (!deploymentsMap || deploymentsMap.size === 0);

  return {
    servicesMap,
    deploymentsMap,
    summaryData,
    byStatus,
    byServiceAndStatus,
    totalCount,
    appliedFilters,
    invocationCounts,
    handlerInvocationCounts,
    serviceIssuesMap,
    handlerIssuesMap,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    isSummaryLoading,
    isSummaryError,
    summaryError,
    summaryQueryKey,
    overviewRefetchInterval,
    isInitialLoading,
    isBare,
    isEmpty,
    isError,
    error,
    isDeploymentsFetching: isFetching,
  };
}
