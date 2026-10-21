import type { components } from '@restate/data-access-admin-api-spec';
import {
  useGetVirtualObjectLock,
  useListInvocationsV2,
} from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import { isVqueueEntry } from '@restate/features-invocation-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  callCron,
  CRON_KEY,
  CRON_SERVICE,
  type CreateScheduleRequest,
  type CronProject,
  type CronSchedule,
  type UpdateScheduleRequest,
} from './cronApi';

type InvocationV2 = components['schemas']['InvocationV2'];

const POLL_INTERVAL = 15_000;

function cronQueryKey(muxUrl: string, scope: string) {
  return ['ingress-mux', muxUrl, scope, CRON_SERVICE, CRON_KEY] as const;
}

export function useCronProject(scope: string) {
  const { ingressMuxUrl = '' } = useRestateContext();
  return useQuery({
    queryKey: [...cronQueryKey(ingressMuxUrl, scope), 'list'],
    queryFn: ({ signal }) =>
      callCron<CronProject>({
        muxUrl: ingressMuxUrl,
        scope,
        handler: 'list',
        signal,
      }),
    enabled: Boolean(ingressMuxUrl),
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    retry: false,
  });
}

function useCronMutation<TVariables, TData>(
  scope: string,
  handler: 'create' | 'update' | 'delete',
  options?: { onSuccess?: (data: TData) => void },
) {
  const { ingressMuxUrl = '' } = useRestateContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TVariables) =>
      callCron<TData>({ muxUrl: ingressMuxUrl, scope, handler, body }),
    onSuccess: (data) => options?.onSuccess?.(data),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: cronQueryKey(ingressMuxUrl, scope),
      }),
  });
}

export function useCreateSchedule(
  scope: string,
  options?: { onSuccess?: (schedule: CronSchedule) => void },
) {
  return useCronMutation<CreateScheduleRequest, CronSchedule>(
    scope,
    'create',
    options,
  );
}

export function useUpdateSchedule(
  scope: string,
  options?: { onSuccess?: (schedule: CronSchedule) => void },
) {
  return useCronMutation<UpdateScheduleRequest, CronSchedule>(
    scope,
    'update',
    options,
  );
}

export function useDeleteSchedule(
  scope: string,
  options?: { onSuccess?: () => void },
) {
  return useCronMutation<{ id: string }, undefined>(scope, 'delete', options);
}

export function useRefreshCrons(scope: string) {
  const { ingressMuxUrl = '' } = useRestateContext();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: cronQueryKey(ingressMuxUrl, scope),
    });
}

export function useCronRunInvocations(scope: string, project?: CronProject) {
  const invocationIds = useMemo(
    () =>
      [
        ...new Set(
          (project?.schedules ?? []).flatMap(({ lastRuns }) =>
            lastRuns.map(({ invocationId }) => invocationId),
          ),
        ),
      ].sort(),
    [project],
  );
  const { data, isPending, error } = useListInvocationsV2(
    {
      filters: [
        { field: 'scope', type: 'STRING', operation: 'EQUALS', value: scope },
        {
          field: 'id',
          type: 'STRING_LIST',
          operation: 'IN',
          value: invocationIds,
        },
      ],
      mode: { type: 'exact' },
    },
    {
      enabled: invocationIds.length > 0,
      refetchInterval: POLL_INTERVAL,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );
  const invocations = useMemo(
    () =>
      new Map(
        (data?.rows ?? [])
          .filter((row): row is InvocationV2 => !isVqueueEntry(row))
          .map((row) => [row.id, row] as const),
      ),
    [data],
  );
  return {
    invocations,
    isPending: invocationIds.length > 0 && isPending,
    error,
  };
}

export function useCronLock(scope: string) {
  return useGetVirtualObjectLock(CRON_SERVICE, CRON_KEY, scope, {
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
}
