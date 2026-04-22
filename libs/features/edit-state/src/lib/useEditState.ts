import {
  getServiceKeyStateQueryOptions,
  getSetServiceStateMutationOptions,
  useAdminBaseUrl,
} from '@restate/data-access/admin-api';
import { convertStateToObject } from '@restate/data-access/admin-api-hooks';
import type { StateResponse } from '@restate/data-access/admin-api-spec';
import {
  useDecodeState,
  useCodecRuntime,
} from '@restate/features/codec-options';
import type { RestateCodecOptions } from '@restate/features/codec';
import { base64ToUint8Array } from '@restate/util/binary';
import { RestateError } from '@restate/util/errors';
import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

function isValidJSON(value: unknown) {
  try {
    return Boolean(JSON.stringify(value));
  } catch (error) {
    return false;
  }
}

export function useEditState(
  service: string,
  objectKey: string,
  {
    enabled,
    ...options
  }: UseMutationOptions<
    StateResponse['state'] | undefined,
    RestateError | Error,
    {
      state: Record<string, string | undefined>;
      partial?: boolean;
    }
  > & { enabled?: boolean } = {},
) {
  const baseUrl = useAdminBaseUrl();
  const codecOptions = {
    service: {
      value: {
        name: service,
      },
    },
    key: objectKey,
  } satisfies RestateCodecOptions;
  const { encode, options: resolvedCodecOptions } =
    useCodecRuntime(codecOptions);
  const queryOptions = getServiceKeyStateQueryOptions(baseUrl, {
    service,
    key: objectKey,
  });
  const query = useQuery({
    ...queryOptions,
    enabled,
    staleTime: 0,
    refetchOnMount: true,
  });
  const version = query.data?.version;
  const decodedQuery = useDecodeState(
    query.data?.state,
    query.data?.version,
    true,
    {
      ...codecOptions,
      command: { type: 'GetState' },
    },
  );
  const { mutationFn, mutationKey, meta } = getSetServiceStateMutationOptions(
    baseUrl,
    {
      service,
    },
  );
  const queryClient = useQueryClient();

  const mutate = async (variables: {
    state: Record<string, string | undefined>;
    partial?: boolean;
  }) => {
    if (!version && variables.partial) {
      throw new RestateError(
        'Partial updates to the state are not supported. Please replace the entire state instead.',
      );
    }

    if (
      !variables.state ||
      typeof variables.state !== 'object' ||
      !isValidJSON(variables.state)
    ) {
      throw new RestateError('Please enter a valid value');
    }

    const encodedVariables = convertStateToObject(
      await Promise.all(
        Object.entries(variables.state).map(([key, value]) =>
          Promise.resolve(
            encode(value, {
              ...resolvedCodecOptions,
              command: {
                type: 'SetState',
                name: key,
              },
            }),
          ).then((encodedValue) => ({
            name: key,
            value: Array.from(base64ToUint8Array(encodedValue)),
          })),
        ),
      ),
    );

    return mutationFn(
      {
        parameters: { path: { service } },
        body: {
          object_key: objectKey,
          ...(variables.partial && { version }),
          new_state: {
            ...(variables.partial &&
              query.data && {
                ...convertStateToObject(
                  query.data.state.map(({ name, value }) => ({
                    name,
                    value: Array.from(base64ToUint8Array(value)),
                  })),
                ),
              }),
            ...encodedVariables,
          },
        },
      },
      { client: queryClient, meta },
    ).then(async () => {
      const { data } = await query.refetch();

      return data?.state;
    });
  };

  const mutation = useMutation({
    mutationFn: mutate,
    mutationKey,
    meta,
    onSuccess(data, variables, context, mutationMeta) {
      options?.onSuccess?.(data, variables, context, mutationMeta);
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            return (
              Array.isArray(query.queryKey) &&
              query.queryKey.at(0) === `/query/services/${service}/state`
            );
          },
        },
        (
          oldData:
            | {
                objects: { key: string; state: StateResponse['state'] }[];
              }
            | undefined,
        ) => {
          if (!oldData || !data) {
            return oldData;
          }

          return {
            ...oldData,
            objects: oldData.objects.map((oldObject) => {
              if (oldObject.key === objectKey) {
                return {
                  ...oldObject,
                  state: data,
                };
              }

              return oldObject;
            }),
          };
        },
      );
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (Array.isArray(query.queryKey)) {
            const [resolvedUrl] = query.queryKey;

            return (
              typeof resolvedUrl === 'string' &&
              resolvedUrl.startsWith(`/query/services/${service}`) &&
              resolvedUrl.includes('/state')
            );
          }

          return false;
        },
      });
    },
  });

  return {
    mutation,
    decodedQuery: {
      ...decodedQuery,
      isPending: query.isPending || decodedQuery.isPending,
      error: query.error || decodedQuery.error,
      data: query.data ? decodedQuery.data : undefined,
    },
  };
}
