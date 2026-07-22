import { useCallback, useMemo, useRef } from 'react';
import {
  getInvocationSummaryStageCount,
  getServiceInvocationStageBreakdownV2,
  getInvocationStatusBreakdownV2,
  getServiceInvocationStatusBreakdownV2,
  useLazyServiceInboxStatusBreakdownsV2,
  useListDrainedDeployments,
  useListDeployments,
  useListServices,
  useProgressiveInvocationSummaryV2,
} from '@restate/data-access/admin-api-hooks';
import {
  getOverviewRefreshMeta,
  useFeatures,
} from '@restate/data-access/admin-api';
import {
  getServiceIssues,
  MIN_TRAFFIC_THRESHOLD,
  type ServiceIssue,
} from '@restate/features/system-health';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getOverviewRefetchInterval,
  INITIAL_OVERVIEW_REFETCH_INTERVAL,
} from './overviewPolling';

export function useOverviewData() {
  const hasVqueues = useFeatures().has('vqueues');
  const overviewRefetchIntervalRef = useRef(INITIAL_OVERVIEW_REFETCH_INTERVAL);
  const overviewRefetchInterval = useCallback(
    () => overviewRefetchIntervalRef.current,
    [],
  );
  const {
    data: { deployments: deploymentsMap } = {},
    isFetched,
    isFetching,
    isError,
    error,
  } = useListDeployments();
  const { data: servicesMap } = useListServices();
  const summary = useProgressiveInvocationSummaryV2(
    { mode: { type: 'sampled', sampleSize: 1_000_000 } },
    {
      refetchInterval: (query) => {
        const queryDurationMs = query.state.data?.queryDurationMs;
        if (queryDurationMs !== undefined) {
          overviewRefetchIntervalRef.current =
            getOverviewRefetchInterval(queryDurationMs);
        }
        return overviewRefetchIntervalRef.current;
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      meta: getOverviewRefreshMeta(),
    },
  );
  const inboxCount = getInvocationSummaryStageCount(summary.data, 'inbox');

  const byStatus = useMemo(
    () => getInvocationStatusBreakdownV2(summary.data),
    [summary.data],
  );
  const byStage = useMemo(
    () =>
      (summary.data?.stageBuckets ?? []).map((bucket) => ({
        name: bucket.key,
        label: bucket.label,
        count: bucket.count,
        statuses: bucket.statuses,
      })),
    [summary.data?.stageBuckets],
  );
  const invocationCounts = useMemo(
    () =>
      new Map(
        (summary.data?.serviceBuckets ?? []).map(({ service, count }) => [
          service,
          count,
        ]),
      ),
    [summary.data?.serviceBuckets],
  );
  const serviceStageCounts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }[]>();
    for (const { service } of summary.data?.serviceBuckets ?? []) {
      counts.set(
        service,
        getServiceInvocationStageBreakdownV2(summary.data, service),
      );
    }
    return counts;
  }, [summary.data]);
  const servicesWithHighInbox = useMemo(
    () =>
      new Set(
        [...serviceStageCounts]
          .filter(([service, stages]) => {
            const inbox = stages.find(({ name }) => name === 'inbox');
            return (
              (inbox?.count ?? 0) >= MIN_TRAFFIC_THRESHOLD &&
              servicesMap?.has(service)
            );
          })
          .map(([service]) => service),
      ),
    [serviceStageCounts, servicesMap],
  );
  const {
    breakdowns: serviceInboxBreakdowns,
    load: loadServiceInboxBreakdown,
  } = useLazyServiceInboxStatusBreakdownsV2();
  const { isNew, isVersionGte } = useRestateContext();
  const serviceIssuesMap = useMemo(() => {
    const map = new Map<string, ServiceIssue[]>();
    for (const service of servicesMap?.values() ?? []) {
      const inboxBreakdown = serviceInboxBreakdowns.get(service.name);
      const stageCounts = new Map(
        (serviceStageCounts.get(service.name) ?? []).map(({ name, count }) => [
          name,
          count,
        ]),
      );
      const issues = getServiceIssues({
        deployment: deploymentsMap?.get(service.deployment_id),
        isVersionGte,
        statusCounts: inboxBreakdown
          ? getServiceInvocationStatusBreakdownV2(
              summary.data,
              service.name,
              inboxBreakdown,
            )
          : stageCounts,
      });
      if (issues.length > 0) map.set(service.name, issues);
    }
    return map;
  }, [
    deploymentsMap,
    isVersionGte,
    serviceInboxBreakdowns,
    serviceStageCounts,
    summary.data,
    servicesMap,
  ]);

  const {
    data: drainedDeploymentIds = new Set(),
    isPending: isDeploymentStatusLoading,
  } = useListDrainedDeployments();
  const isSummaryLoading = summary.isPending || summary.isPlaceholderData;
  const isInboxBreakdownLoading =
    inboxCount > 0 && summary.isBreakdownLoading('inbox');
  const isSummaryError = summary.isError;
  const summaryError = summary.error;
  const hasData = isNew || deploymentsMap !== undefined;
  const isInitialLoading = !isFetched && !isNew;
  const isBare = !isInitialLoading && !hasData;
  const isEmpty =
    !isInitialLoading &&
    hasData &&
    (!deploymentsMap || deploymentsMap.size === 0);
  return {
    servicesMap,
    deploymentsMap,
    byStage,
    byStatus,
    totalCount: summary.data?.total ?? 0,
    invocationCounts,
    serviceStageCounts,
    servicesWithHighInbox,
    serviceIssuesMap,
    loadServiceInboxBreakdown,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    isSummaryLoading,
    isBreakdownSampled: hasVqueues,
    isInboxBreakdownLoading,
    isInboxBreakdownError: summary.isBreakdownError('inbox'),
    isCompletedBreakdownLoading: summary.isBreakdownLoading('finished'),
    isCompletedBreakdownError: summary.isBreakdownError('finished'),
    isSummaryError,
    summaryError,
    isServiceSummaryLoading: isSummaryLoading,
    isServiceSummaryError: isSummaryError,
    overviewRefetchInterval,
    isInitialLoading,
    isBare,
    isEmpty,
    isError,
    error,
    isDeploymentsFetching: isFetching,
  };
}
