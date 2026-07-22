import type { components } from '@restate/data-access/admin-api-spec';
import {
  adminApi,
  hasCompleteVqueueInvocationPopulation,
  useAdminBaseUrl,
  useAPIStatus,
  useFeatures,
  type HookQueryOptions,
} from '@restate/data-access/admin-api';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

type InboxBreakdownData =
  components['schemas']['InboxInvocationsBreakdownV2Response'];

type ListInvocationsV2Options = HookQueryOptions<
  '/query/v2/invocations',
  'post'
> & {
  onFetchStart?: () => void;
};

export function useListInvocationsV2(
  body: components['schemas']['ListInvocationsV2RequestBody'],
  options?: ListInvocationsV2Options,
) {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const { onFetchStart, ...useQueryOptions } = options ?? {};
  const { queryFn, ...queryOptions } = adminApi(
    'query',
    '/query/v2/invocations',
    'post',
    {
      baseUrl,
      body,
    },
  );
  const result = useQuery({
    ...queryOptions,
    ...useQueryOptions,
    queryFn: (...args: Parameters<typeof queryFn>) => {
      onFetchStart?.();
      return queryFn(...args);
    },
    meta: { ...queryOptions.meta, ...useQueryOptions.meta },
    enabled: useQueryOptions.enabled !== false && enabled,
  });

  return { ...result, queryKey: queryOptions.queryKey };
}

export function useSummaryInvocationsV2(
  body: components['schemas']['SummaryInvocationsV2RequestBody'],
  options?: HookQueryOptions<'/query/v2/invocations/summary', 'post'>,
) {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/v2/invocations/summary',
    'post',
    { baseUrl, body },
  );
  const result = useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...options?.meta },
    enabled: options?.enabled !== false && enabled,
  });

  return {
    ...result,
    queryKey: queryOptions.queryKey,
  };
}

type InvocationSummaryData =
  components['schemas']['SummaryInvocationsV2Response'];

export function mergeInvocationSummaryBreakdowns(
  stages: InvocationSummaryData | undefined,
  breakdowns: InvocationSummaryData | undefined,
) {
  if (!stages || !breakdowns) return stages;

  const stageKeys = new Set(stages.stageBuckets.map((stage) => stage.key));
  const supplementalStages = breakdowns.stageBuckets.filter(
    (stage) => !stageKeys.has(stage.key),
  );
  const refinableStages = [
    ...stages.stageBuckets.filter((stage) => stage.breakdownCanRefine),
    ...supplementalStages,
  ];
  const missingStageKeys = new Set<string>(
    supplementalStages.map((stage) => stage.key),
  );
  const refinableStatuses = new Set(
    refinableStages.flatMap((stage) => stage.statuses),
  );
  const breakdownStages = new Map(
    breakdowns.stageBuckets.map((stage) => [stage.key, stage]),
  );
  const stageCounts = new Map(
    [...stages.stageBuckets, ...supplementalStages].map((stage) => [
      stage.key,
      stage.count,
    ]),
  );
  const refinedStatusBuckets = breakdowns.statusBuckets
    .filter((bucket) =>
      bucket.statuses.some((status) => refinableStatuses.has(status)),
    )
    .map((bucket) => {
      const sourceStage = breakdowns.stageBuckets.find((stage) =>
        bucket.statuses.some((status) => stage.statuses.includes(status)),
      );
      const targetCount = sourceStage
        ? (stageCounts.get(sourceStage.key) ?? 0)
        : 0;
      const scale =
        sourceStage?.breakdownIsPartial && sourceStage.count > 0
          ? targetCount / sourceStage.count
          : 1;
      return { ...bucket, count: Math.round(bucket.count * scale) };
    });
  const stageBuckets = [
    ...stages.stageBuckets.map((stage) => {
      if (!stage.breakdownCanRefine) return stage;
      const breakdown = breakdownStages.get(stage.key);
      return breakdown
        ? {
            ...stage,
            breakdownIsPartial: breakdown.breakdownIsPartial,
            breakdownCoverage: breakdown.breakdownCoverage,
            breakdownCanRefine: false,
          }
        : stage;
    }),
    ...supplementalStages,
  ];
  const serviceBuckets = new Map(
    stages.serviceBuckets.map((bucket) => [bucket.service, bucket]),
  );
  for (const breakdownService of breakdowns.serviceBuckets) {
    const stageService = serviceBuckets.get(breakdownService.service);
    const statusBuckets = [...(stageService?.statusBuckets ?? [])];
    const statusBucketIndexes = new Map(
      statusBuckets.map((bucket, index) => [bucket.key, index]),
    );
    for (const bucket of breakdownService.statusBuckets) {
      if (!missingStageKeys.has(bucket.key)) continue;
      const index = statusBucketIndexes.get(bucket.key);
      if (index === undefined) {
        statusBucketIndexes.set(bucket.key, statusBuckets.length);
        statusBuckets.push(bucket);
      } else {
        statusBuckets[index] = bucket;
      }
    }
    serviceBuckets.set(breakdownService.service, {
      ...breakdownService,
      ...stageService,
      count: statusBuckets.reduce((total, bucket) => total + bucket.count, 0),
      statusBuckets,
    });
  }

  return {
    ...stages,
    queryDurationMs: Math.max(
      stages.queryDurationMs,
      breakdowns.queryDurationMs,
    ),
    isPartial: stages.isPartial || breakdowns.isPartial,
    stageCountsArePartial:
      stages.stageCountsArePartial ||
      supplementalStages.some((stage) => stage.breakdownIsPartial),
    total: stageBuckets.reduce((total, stage) => total + stage.count, 0),
    stageBuckets,
    statusBuckets: [
      ...stages.statusBuckets.filter(
        (bucket) =>
          !bucket.statuses.some((status) => refinableStatuses.has(status)),
      ),
      ...refinedStatusBuckets,
    ],
    serviceBuckets: [...serviceBuckets.values()].sort((left, right) =>
      right.count !== left.count
        ? right.count - left.count
        : left.service.localeCompare(right.service),
    ),
  };
}

export function useProgressiveInvocationSummaryV2(
  body: Omit<components['schemas']['SummaryInvocationsV2RequestBody'], 'view'>,
  options?: HookQueryOptions<'/query/v2/invocations/summary', 'post'>,
) {
  const features = useFeatures();
  const eagerBreakdowns = features.has('vqueues');
  const splitCompletedStage =
    eagerBreakdowns && !hasCompleteVqueueInvocationPopulation(features);
  const stages = useSummaryInvocationsV2(
    {
      ...body,
      view: splitCompletedStage ? 'live-stages' : 'stages',
    },
    options,
  );
  const refinableStageNames = useMemo(
    () => [
      ...(stages.data?.stageBuckets
        .filter((stage) => stage.breakdownCanRefine)
        .map((stage) => stage.key) ?? []),
      ...(splitCompletedStage ? (['finished'] as const) : []),
    ],
    [splitCompletedStage, stages.data?.stageBuckets],
  );
  const breakdowns = useSummaryInvocationsV2(
    { ...body, view: 'breakdowns' },
    {
      ...options,
      enabled:
        options?.enabled !== false &&
        (eagerBreakdowns || refinableStageNames.length > 0),
    },
  );
  const data = useMemo(
    () => mergeInvocationSummaryBreakdowns(stages.data, breakdowns.data),
    [breakdowns.data, stages.data],
  );
  const isBreakdownLoading = useCallback(
    (stage: string) =>
      refinableStageNames.includes(
        stage as components['schemas']['InvocationSummaryStageV2'],
      ) &&
      breakdowns.data === undefined &&
      !breakdowns.isError,
    [breakdowns.data, breakdowns.isError, refinableStageNames],
  );
  const isBreakdownError = useCallback(
    (stage: string) =>
      refinableStageNames.includes(
        stage as components['schemas']['InvocationSummaryStageV2'],
      ) && breakdowns.isError,
    [breakdowns.isError, refinableStageNames],
  );

  return {
    ...stages,
    data,
    isFetching: stages.isFetching || breakdowns.isFetching,
    isStageFetching: stages.isFetching,
    isBreakdownLoading,
    isBreakdownError,
    queryKeys: [stages.queryKey, breakdowns.queryKey] as const,
  };
}

export function useInboxInvocationsBreakdownV2(
  body: components['schemas']['InboxInvocationsBreakdownV2RequestBody'],
  options?: HookQueryOptions<'/query/v2/invocations/inbox', 'post'>,
) {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/v2/invocations/inbox',
    'post',
    { baseUrl, body },
  );
  const result = useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...options?.meta },
    enabled: options?.enabled !== false && enabled,
  });

  return { ...result, queryKey: queryOptions.queryKey };
}

export function useLazyServiceInboxStatusBreakdownsV2() {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const queries = useQueries({
    queries: serviceNames.map((serviceName) => ({
      ...adminApi('query', '/query/v2/invocations/inbox', 'post', {
        baseUrl,
        body: { groupBy: 'status' as const, serviceNames: [serviceName] },
      }),
      enabled,
      staleTime: Infinity,
    })),
  });
  const breakdowns = useMemo(
    () =>
      new Map(
        serviceNames.flatMap((serviceName, index) => {
          const data = queries[index]?.data as InboxBreakdownData | undefined;
          return data ? [[serviceName, data] as const] : [];
        }),
      ),
    [queries, serviceNames],
  );

  const load = useCallback(
    (serviceName: string) => {
      if (!enabled) return;
      setServiceNames((current) =>
        current.includes(serviceName) ? current : [...current, serviceName],
      );
    },
    [enabled],
  );

  return { breakdowns, load };
}

export function useFinishedInvocationsBreakdownV2(
  body: components['schemas']['FinishedInvocationsBreakdownV2RequestBody'],
  options?: HookQueryOptions<
    '/query/v2/invocations/finished-breakdown',
    'post'
  >,
) {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/v2/invocations/finished-breakdown',
    'post',
    { baseUrl, body },
  );
  const result = useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...options?.meta },
    enabled: options?.enabled !== false && enabled,
  });

  return { ...result, queryKey: queryOptions.queryKey };
}

export function useFinishedInvocationsHistoryV2(
  body: components['schemas']['FinishedInvocationsHistoryV2RequestBody'],
  options?: HookQueryOptions<'/query/v2/invocations/finished-history', 'post'>,
) {
  const enabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/v2/invocations/finished-history',
    'post',
    { baseUrl, body },
  );
  const result = useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...options?.meta },
    enabled: options?.enabled !== false && enabled,
  });

  return { ...result, queryKey: queryOptions.queryKey };
}
