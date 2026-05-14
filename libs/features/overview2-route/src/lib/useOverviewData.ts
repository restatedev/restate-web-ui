import { useMemo } from 'react';
import {
  useListDrainedDeployments,
  useListDeployments,
  useListServices,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getServiceIssues,
  type ServiceIssue,
} from '@restate/features/system-health';
import type { FilterItem } from '@restate/data-access/admin-api-spec';

export function useOverviewData(filters: FilterItem[] = []) {
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
    isFetching: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    queryKey: summaryQueryKey,
  } = useSummaryInvocations(filters, { sampled: false });
  const {
    data: drainedDeploymentIds = new Set(),
    isPending: isDeploymentStatusLoading,
  } = useListDrainedDeployments();
  const summaryData = isSummaryError ? undefined : rawSummaryData;

  const { isNew, isVersionGte } = useRestateContext();

  const byStatus = summaryData?.byStatus ?? [];
  const byServiceAndStatus = summaryData?.byServiceAndStatus ?? [];
  const totalCount = summaryData?.totalCount ?? 0;

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

  const isInitialLoading = !isNew && !deploymentsMap && isFetching;
  const isEmpty =
    (isFetched || isNew) && (!deploymentsMap || deploymentsMap.size === 0);

  return {
    servicesMap,
    deploymentsMap,
    byStatus,
    byServiceAndStatus,
    totalCount,
    invocationCounts,
    serviceIssuesMap,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    isSummaryLoading,
    isSummaryError,
    summaryError,
    summaryQueryKey,
    isInitialLoading,
    isEmpty,
    isError,
    error,
  };
}
