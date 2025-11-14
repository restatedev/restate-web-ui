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

function toBatchMutationFn<Body extends BatchInvocationsRequestBody>(
  _mutationFn: NonNullable<
    MutationOptions<
      BatchInvocationsResponse | undefined,
      Error,
      { body?: Body }
    >['mutationFn']
  >,
  onProgress?: (response: BatchInvocationsResponse) => void,
) {
  return async (args: Parameters<typeof _mutationFn>[0]) => {
    const mutationFn = _mutationFn as (args: {
      body?: Body;
    }) => ReturnType<typeof _mutationFn>;
    const response = await mutationFn(args);

    if (!response) {
      throw new Error('No response from server');
    }

    onProgress?.(response);

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
        const nextResponse = await mutationFn({
          ...args,
          body: {
            ...(args.body as Body),
            createdAfter: currentLastCreatedAt,
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
}

export function useBatchCancelInvocations(
  options?: Omit<
    HookMutationOptions<'/query/invocations/cancel', 'post'>,
    'mutationFn'
  > & {
    onProgress?: (response: BatchInvocationsResponse) => void;
  },
) {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const { onProgress, ...restOptions } = options ?? {};

  const mutationOptions = adminApi(
    'mutate',
    '/query/invocations/cancel',
    'post',
    {
      baseUrl,
    },
  );

  const mutationFn = toBatchMutationFn(mutationOptions.mutationFn, onProgress);

  return useMutation({
    ...mutationOptions,
    ...restOptions,
    mutationFn,
    onSuccess(data, variables, context, meta) {
      queryClient.invalidateQueries({
        queryKey: ['/query/invocations'],
      });

      restOptions?.onSuccess?.(data, variables, context, meta);
    },
  });
}
