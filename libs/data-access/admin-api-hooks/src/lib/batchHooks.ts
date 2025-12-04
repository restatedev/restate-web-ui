import type {
  BatchInvocationsRequestBody,
  BatchInvocationsResponse,
} from '@restate/data-access/admin-api/spec';
import {
  MutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { adminApi } from '@restate/data-access/admin-api';
import { useAdminBaseUrl } from '@restate/data-access/admin-api';
import type { HookMutationOptions } from '@restate/data-access/admin-api';
import { useState, useEffect, useRef } from 'react';

function toBatchMutationFn<Body extends BatchInvocationsRequestBody>(
  batchSize: number,
  _mutationFn: NonNullable<
    MutationOptions<
      BatchInvocationsResponse | undefined,
      Error,
      { body?: Body }
    >['mutationFn']
  >,
  onProgress?: (response: BatchInvocationsResponse) => void,
) {
  const mutationFn = async (
    args: Parameters<typeof _mutationFn>[0] & { id: string },
  ) => {
    const baseMutationFn = _mutationFn as (args: {
      body?: Body;
    }) => ReturnType<typeof _mutationFn>;
    const response = await baseMutationFn({
      body: { ...args.body, pageSize: batchSize } as Body,
    });

    if (!response) {
      throw new Error('No response from server');
    }

    onProgress?.(response);
    const operationId = args.id;

    if (
      'filters' in (args.body ?? {}) &&
      response.hasMore &&
      response.lastCreatedAt
    ) {
      let currentHasMore: boolean | undefined = response.hasMore;
      let currentLastCreatedAt: string | undefined = response.lastCreatedAt;
      let totalSuccessful = response.successful;
      let totalFailed = response.failed;
      const allFailedIds = [...(response.failedInvocationIds ?? [])];

      while (currentHasMore && currentLastCreatedAt) {
        // Wait for resume if paused (only if operationId provided)
        if (operationId) {
          await Promise.resolve(
            globalThis.batchOperationPromises?.[operationId]?.promise,
          );
        }

        const nextResponse = await baseMutationFn({
          ...args,
          body: {
            ...(args.body as Body),
            createdAfter: currentLastCreatedAt,
            pageSize: batchSize,
          },
        });

        if (!nextResponse) {
          break;
        }

        totalSuccessful += nextResponse.successful;
        totalFailed += nextResponse.failed;
        allFailedIds.push(...(nextResponse.failedInvocationIds ?? []));
        currentHasMore = nextResponse.hasMore;
        currentLastCreatedAt = nextResponse.lastCreatedAt;

        onProgress?.(nextResponse);
      }

      return {
        ...response,
        successful: totalSuccessful,
        failed: totalFailed,
        failedInvocationIds: allFailedIds,
        hasMore: false,
      };
    }

    return response;
  };

  return {
    mutationFn,
  };
}

function useIsPaused() {
  const [isPaused, setIsPaused] = useState<Record<string, boolean>>({});
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(isPausedRef.current).forEach((id) => {
        if (globalThis.batchOperationPromises?.[id]) {
          globalThis.batchOperationPromises[id]?.resolve?.(true);
        }
      });
      globalThis.batchOperationPromises = {
        ...globalThis.batchOperationPromises,
        ...Object.keys(isPausedRef.current).reduce(
          (p, c) => ({ ...p, [c]: null }),
          {},
        ),
      };
    };
  }, []);

  return {
    cancel: (id: string) => {
      globalThis.batchOperationPromises?.[id]?.reject?.(true);
      globalThis.batchOperationPromises = {
        ...globalThis.batchOperationPromises,
        [id]: null,
      };
      setIsPaused((old) => {
        delete old[id];
        return old;
      });
    },
    isPaused: (id: string) => isPaused[id] === true,
    pause(id: string) {
      globalThis.batchOperationPromises = {
        ...globalThis.batchOperationPromises,
        [id]: Promise.withResolvers(),
      };
      setIsPaused((old) => ({
        ...old,
        [id]: true,
      }));
    },
    resume(id: string) {
      globalThis.batchOperationPromises?.[id]?.resolve?.(true);
      globalThis.batchOperationPromises = {
        ...globalThis.batchOperationPromises,
        [id]: null,
      };
      setIsPaused((old) => ({
        ...old,
        [id]: false,
      }));
    },
  };
}

export function useBatchCancelInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/cancel', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSuccess,
    onSettled,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/cancel',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });
  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}

export function useBatchPurgeInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/purge', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSettled,
    onSuccess,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/purge',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });
  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}

export function useBatchRestateAsNewInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/restart-as-new', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSettled,
    onSuccess,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/restart-as-new',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });
  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}

export function useBatchKillInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/kill', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSettled,
    onSuccess,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/kill',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });
  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}

export function useBatchPauseInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/pause', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSettled,
    onSuccess,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/pause',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });

  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}

export function useBatchResumeInvocations(
  batchSize: number,
  options?: Omit<
    HookMutationOptions<'/query/invocations/resume', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const {
    onProgress,
    onError,
    onMutate,
    onSettled,
    onSuccess,
    ...restOptions
  } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/resume',
    'post',
    {
      baseUrl,
    },
  );

  const { pause, resume, isPaused, cancel } = useIsPaused();
  const { mutationFn } = toBatchMutationFn(
    batchSize,
    mutationOptions.mutationFn,
    onProgress,
  );

  const result = useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      onSuccess?.(data, variables, context, meta);
    },
    onError(error, variables, onMutateResult, context) {
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled(data, error, variables, onMutateResult, context) {
      onSettled?.(data, error, variables, onMutateResult, context);
    },
    onMutate(variables, context) {
      onMutate?.(variables, context);
    },
  });

  return {
    ...result,
    pause,
    resume,
    isPaused,
    cancel,
  };
}
