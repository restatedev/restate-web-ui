import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  useAdminBaseUrl,
  useAPIStatus,
} from '@restate/data-access-admin-api';
import { useEffect, useMemo, useRef } from 'react';
import {
  getInvocationStatusDetailsQueryKey,
  isCompletedInvocationStatus,
  type InvocationStatusDetailsData,
} from './hooks';

const MAX_STATUS_CHECK_MISSES = 3;
const STATUS_CHECK_FLUSH_MS = 1_000;
const STATUS_CHECK_MIN_INTERVAL_MS = 250;
const STATUS_CHECK_RETRY_MS = 10_000;
const STATUS_CHECK_KNOWN_SHARE = 4;

export interface InvocationStatusCheckData {
  checkedAt: number;
}

export type InvocationStatusCheckFailure = 'unchecked' | 'stale';

type CheckedStatus =
  InvocationStatusDetailsData['invocations'][string]['status'];

export interface StatusCheckState {
  known: Map<string, CheckedStatus>;
  misses: Map<string, number>;
  finishedProblems: Map<
    string,
    InvocationStatusDetailsData['invocations'][string]
  >;
  checkedAt: Map<string, number>;
  sequence: number;
  run: number;
  untriedOnly: boolean;
  lastTimedRunAt: number;
}

export function createStatusCheckState(): StatusCheckState {
  return {
    known: new Map(),
    misses: new Map(),
    finishedProblems: new Map(),
    checkedAt: new Map(),
    sequence: 0,
    run: 0,
    untriedOnly: false,
    lastTimedRunAt: 0,
  };
}

function getRemainingInterval(
  period: number | false,
  lastRunAt: number,
): number | false {
  if (period === false) {
    return false;
  }
  return Math.max(
    STATUS_CHECK_MIN_INTERVAL_MS,
    period - (Date.now() - lastRunAt),
  );
}

function isPastRetryDelay(errorUpdatedAt: number) {
  return Date.now() - errorUpdatedAt >= STATUS_CHECK_RETRY_MS;
}

function isOpenForCheck(state: StatusCheckState, invocationId: string) {
  return (
    !isCompletedInvocationStatus(state.known.get(invocationId)) &&
    (state.misses.get(invocationId) ?? 0) < MAX_STATUS_CHECK_MISSES
  );
}

function isUntriedForCheck(state: StatusCheckState, invocationId: string) {
  return !state.known.has(invocationId) && !state.misses.has(invocationId);
}

export async function runInvocationStatusCheck({
  context,
  state,
  invocationIds,
  baseUrl,
  referenceInvocationId,
  sharedKey,
  batchSize,
  maxPerRefresh,
  batchPauseMs = 0,
  shouldShare,
  onProgress,
}: {
  context: { client: QueryClient };
  state: StatusCheckState;
  invocationIds: string[];
  baseUrl: string;
  referenceInvocationId: string;
  sharedKey: ReturnType<typeof getInvocationStatusDetailsQueryKey>;
  batchSize: number;
  maxPerRefresh: number;
  batchPauseMs?: number;
  shouldShare: (status?: string) => boolean;
  onProgress?: (
    checked: number,
    total: number,
    failure?: InvocationStatusCheckFailure,
  ) => void;
}): Promise<InvocationStatusCheckData> {
  const run = ++state.run;
  const untriedOnly = state.untriedOnly;
  state.untriedOnly = false;
  const open = invocationIds.filter((id) => isOpenForCheck(state, id));
  const untried = open.filter((id) => isUntriedForCheck(state, id));
  const tried = untriedOnly
    ? []
    : open.filter((id) => !isUntriedForCheck(state, id));
  const room = Math.max(
    Math.floor(maxPerRefresh / STATUS_CHECK_KNOWN_SHARE),
    maxPerRefresh - untried.length,
  );
  const rotated =
    tried.length > room
      ? [...tried]
          .sort(
            (a, b) =>
              (state.checkedAt.get(a) ?? 0) - (state.checkedAt.get(b) ?? 0),
          )
          .slice(0, room)
      : tried;
  const ids = [...untried, ...rotated];
  const showsProgress = untried.length > batchSize;
  let pending: InvocationStatusDetailsData['invocations'] = {};
  let flushedAt = Date.now();
  const flush = () => {
    const shared =
      context.client.getQueryData<InvocationStatusDetailsData>(sharedKey)
        ?.invocations ?? {};
    const updates = Object.fromEntries(
      [...state.finishedProblems, ...Object.entries(pending)].filter(
        ([invocationId, status]) =>
          (shouldShare(status.status) || invocationId in shared) &&
          shared[invocationId]?.status !== status.status,
      ),
    );
    pending = {};
    flushedAt = Date.now();
    if (Object.keys(updates).length > 0) {
      context.client.setQueryData<InvocationStatusDetailsData>(
        sharedKey,
        (current) => ({
          ...current,
          invocations: { ...current?.invocations, ...updates },
        }),
      );
    }
  };
  if (showsProgress) {
    onProgress?.(0, ids.length);
  }
  let checked = 0;
  let isComplete = false;
  try {
    for (let start = 0; start < ids.length; start += batchSize) {
      if (start > 0 && batchPauseMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, batchPauseMs));
      }
      const batch = ids.slice(start, start + batchSize);
      const data = (await adminApi(
        'query',
        '/query/invocations/statuses',
        'post',
        {
          baseUrl,
          parameters: { query: { referenceInvocationId } },
          body: { invocationIds: batch },
        },
      ).queryFn(context as never)) ?? { invocations: {} };
      for (const invocationId of batch) {
        state.checkedAt.set(invocationId, ++state.sequence);
        const status = data.invocations[invocationId];
        if (status?.status) {
          state.misses.delete(invocationId);
          state.known.set(invocationId, status.status);
          pending[invocationId] = status;
          if (
            shouldShare(status.status) &&
            isCompletedInvocationStatus(status.status)
          ) {
            state.finishedProblems.set(invocationId, status);
          }
        } else {
          state.misses.set(
            invocationId,
            (state.misses.get(invocationId) ?? 0) + (untriedOnly ? 0 : 1),
          );
          pending[invocationId] = {};
        }
      }
      checked += batch.length;
      if (Date.now() - flushedAt >= STATUS_CHECK_FLUSH_MS) {
        flush();
        if (showsProgress && run === state.run) {
          onProgress?.(checked, ids.length);
        }
      }
    }
    isComplete = true;
  } finally {
    flush();
    if (!untriedOnly) {
      state.lastTimedRunAt = Date.now();
    }
    if (run === state.run) {
      if (checked < untried.length) {
        onProgress?.(checked, untried.length, 'unchecked');
      } else if (!isComplete) {
        onProgress?.(checked, ids.length, 'stale');
      } else {
        onProgress?.(ids.length, ids.length);
      }
    }
  }
  return { checkedAt: Date.now() };
}

export function useInvocationStatusCheck(
  invocationIds: string[],
  referenceInvocationId: string,
  {
    enabled,
    batchSize,
    maxPerRefresh,
    batchPauseMs,
    shouldShare,
    refetchInterval,
    onProgress,
  }: {
    enabled: boolean;
    batchSize: number;
    maxPerRefresh: number;
    batchPauseMs?: number;
    shouldShare: (status?: string) => boolean;
    refetchInterval: (unfinished: number) => number | false;
    onProgress?: (
      checked: number,
      total: number,
      failure?: InvocationStatusCheckFailure,
    ) => void;
  },
) {
  const isApiEnabled = useAPIStatus();
  const baseUrl = useAdminBaseUrl();
  const stateRef = useRef<StatusCheckState>(createStatusCheckState());
  const sharedKey = getInvocationStatusDetailsQueryKey(
    baseUrl,
    referenceInvocationId,
  );
  const isEnabled = enabled && isApiEnabled && invocationIds.length > 0;
  const checkKey = useMemo(
    () =>
      [
        '/query/invocations/statuses/check',
        { baseUrl, referenceInvocationId },
      ] as const,
    [baseUrl, referenceInvocationId],
  );
  const results = useQuery<InvocationStatusCheckData>({
    queryKey: checkKey,
    enabled: isEnabled,
    staleTime: 0,
    structuralSharing: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      query.state.status === 'error' &&
      invocationIds.some((id) => isUntriedForCheck(stateRef.current, id))
        ? getRemainingInterval(
            STATUS_CHECK_RETRY_MS,
            query.state.errorUpdatedAt,
          )
        : getRemainingInterval(
            refetchInterval(
              invocationIds.filter((id) => isOpenForCheck(stateRef.current, id))
                .length,
            ),
            stateRef.current.lastTimedRunAt,
          ),
    queryFn: (context) =>
      runInvocationStatusCheck({
        context,
        state: stateRef.current,
        invocationIds,
        baseUrl,
        referenceInvocationId,
        sharedKey,
        batchSize,
        maxPerRefresh,
        batchPauseMs,
        shouldShare,
        onProgress,
      }),
  });
  const { isFetching, isError, errorUpdatedAt, refetch } = results;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (
      isEnabled &&
      !isFetching &&
      (!isError || isPastRetryDelay(errorUpdatedAt)) &&
      queryClient.getQueryState(checkKey)?.fetchStatus === 'idle' &&
      invocationIds.some((id) => isUntriedForCheck(stateRef.current, id))
    ) {
      const period = refetchInterval(
        invocationIds.filter((id) => isOpenForCheck(stateRef.current, id))
          .length,
      );
      stateRef.current.untriedOnly =
        getRemainingInterval(period, stateRef.current.lastTimedRunAt) !==
        STATUS_CHECK_MIN_INTERVAL_MS;
      void refetch({ cancelRefetch: false });
    }
  }, [
    isEnabled,
    isFetching,
    isError,
    errorUpdatedAt,
    refetch,
    refetchInterval,
    invocationIds,
    queryClient,
    checkKey,
  ]);
  return results;
}
