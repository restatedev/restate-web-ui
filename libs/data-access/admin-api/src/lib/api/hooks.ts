import type { paths, components } from './index'; // generated by openapi-typescript
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminApi,
  MutationOptions,
  OperationBody,
  OperationParameters,
  QueryOptions,
  SupportedMethods,
} from './client';
import { useAdminBaseUrl } from '../AdminBaseUrlProvider';
import type {
  DeploymentId,
  Revision,
  ServiceName,
  Deployment,
  FilterItem,
  Service,
} from './type';
import { useEffect } from 'react';
import { RestateError } from '@restate/util/errors';

type HookQueryOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>
> = Omit<QueryOptions<Path, Method>, 'queryFn' | 'queryKey'>;

type HookMutationOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method> = OperationParameters<
    Path,
    Method
  >,
  Body extends OperationBody<Path, Method> = OperationBody<Path, Method>
> = Omit<
  MutationOptions<Path, Method, Parameters, Body>,
  'mutationFn' | 'mutationKey'
>;

function listDeploymentsSelector(
  data:
    | {
        deployments: components['schemas']['DeploymentResponse'][];
      }
    | undefined
) {
  if (!data) {
    return undefined;
  }

  const { deployments: deploymentsFromApi } = data;
  const { services, deployments } = deploymentsFromApi.reduce(
    (results, deployment) => {
      const { services, deployments } = results;
      // TODO: refactor sorting of revisions
      deployment.services.forEach((service) => {
        // eslint-disable-next-line prefer-const
        let { deployments: serviceDeployments, sortedRevisions } =
          services.get(service.name) ?? {};
        const currentRevisionsDeployments: DeploymentId[] =
          serviceDeployments?.[service.revision] ?? [];
        const sortedRevisionsSet = new Set<number>(sortedRevisions);
        sortedRevisionsSet.add(service.revision);

        serviceDeployments = {
          ...serviceDeployments,
          [service.revision]: [...currentRevisionsDeployments, deployment.id],
        };
        services.set(service.name, {
          deployments: serviceDeployments,
          sortedRevisions: Array.from(sortedRevisionsSet).sort((a, b) => b - a),
        });

        deployments.set(deployment.id, deployment);
      });
      return { services, deployments };
    },
    {
      services: new Map<
        ServiceName,
        {
          deployments: Record<Revision, DeploymentId[]>;
          sortedRevisions: number[];
        }
      >(),
      deployments: new Map<DeploymentId, Deployment>(),
    }
  );

  const sortedServiceNames = Array.from(services.keys()).sort((a, b) => {
    const aRevision = services.get(a)?.sortedRevisions[0] ?? 1;
    const bRevision = services.get(b)?.sortedRevisions[0] ?? 1;
    const aDeploymentId = services.get(a)?.deployments[aRevision]?.[0];
    const bDeploymentId = services.get(b)?.deployments[bRevision]?.[0];
    const aDeployment = aDeploymentId && deployments.get(aDeploymentId);
    const bDeployment = bDeploymentId && deployments.get(bDeploymentId);
    if (!aDeployment || !bDeployment) {
      return Number(bDeployment) - Number(aDeployment);
    }
    const { created_at: aCreated } = aDeployment;
    const { created_at: bCreated } = bDeployment;

    return new Date(bCreated).valueOf() - new Date(aCreated).valueOf();
  });
  return { services, deployments, sortedServiceNames };
}

export function useListDeployments(
  options?: HookQueryOptions<'/deployments', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/deployments', 'get', { baseUrl });

  const results = useQuery({
    ...queryOptions,
    ...options,
    select: listDeploymentsSelector,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useHealth(options?: HookQueryOptions<'/health', 'get'>) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/health', 'get', { baseUrl });
  return useQuery({
    ...queryOptions,
    ...options,
  });
}

export function useOpenApi(options?: HookQueryOptions<'/openapi', 'get'>) {
  const baseUrl = useAdminBaseUrl();

  return useQuery({
    ...adminApi('query', '/openapi', 'get', { baseUrl }),
    ...options,
  });
}

export function useVersion(options?: HookQueryOptions<'/version', 'get'>) {
  const baseUrl = useAdminBaseUrl();

  return useQuery({
    ...adminApi('query', '/version', 'get', { baseUrl }),
    ...options,
  });
}

export function useRegisterDeployment(
  options?: HookMutationOptions<'/deployments', 'post'>
) {
  const baseUrl = useAdminBaseUrl();

  return useMutation({
    ...adminApi('mutate', '/deployments', 'post', { baseUrl }),
    ...options,
  });
}

export function useServiceDetails(
  service: string,
  options?: HookQueryOptions<'/services/{service}', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/services/{service}', 'get', {
    baseUrl,
    parameters: { path: { service } },
  });

  const results = useQuery({
    staleTime: 0,
    ...queryOptions,
    ...options,
  });

  return { ...results, queryKey: queryOptions.queryKey };
}

export function useListServices(
  services: string[] = [],
  options?: HookQueryOptions<'/services/{service}', 'get'>
) {
  const baseUrl = useAdminBaseUrl();

  const results = useQueries({
    queries: services.map((service) => ({
      ...adminApi('query', '/services/{service}', 'get', {
        baseUrl,
        parameters: { path: { service } },
      }),
      staleTime: 0,
      ...options,
    })),
    combine: (results) => {
      return {
        data: results.reduce((result, service) => {
          if (service.data) {
            result.set(service.data?.name, service.data);
          }
          return result;
        }, new Map<string, Service>()),
        isPending: results.some((result) => result.isPending),
        promise: Promise.all(results.map(({ promise }) => promise)),
      };
    },
  });

  return results;
}

export function useDeploymentDetails(
  deployment: string,
  options?: HookQueryOptions<'/deployments/{deployment}', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/deployments/{deployment}', 'get', {
    baseUrl,
    parameters: { path: { deployment } },
  });

  const results = useQuery({
    staleTime: 0,
    ...queryOptions,
    ...options,
  });

  return { ...results, queryKey: queryOptions.queryKey };
}

export function useModifyService(
  service: string,
  options?: HookMutationOptions<'/services/{service}', 'patch'>
) {
  const baseUrl = useAdminBaseUrl();

  return useMutation({
    ...adminApi('mutate', '/services/{service}', 'patch', {
      baseUrl,
      resolvedPath: `/services/${service}`,
    }),
    ...options,
  });
}

export function useDeleteDeployment(
  deployment: string,
  options?: HookMutationOptions<'/deployments/{deployment}', 'delete'>
) {
  const baseUrl = useAdminBaseUrl();

  return useMutation({
    ...adminApi('mutate', '/deployments/{deployment}', 'delete', {
      baseUrl,
      resolvedPath: `/deployments/${deployment}`,
    }),
    ...options,
  });
}

export function useServiceOpenApi(
  service: string,
  options?: HookQueryOptions<'/services/{service}/openapi', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/services/{service}/openapi', 'get', {
    baseUrl,
    parameters: { path: { service } },
  });

  const results = useQuery({
    staleTime: 0,
    ...queryOptions,
    ...options,
  });

  return { ...results, queryKey: queryOptions.queryKey };
}

export function useListInvocations(
  filters?: FilterItem[],
  options?: HookQueryOptions<'/query/invocations', 'post'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/query/invocations', 'post', {
    baseUrl,
    body: {
      filters,
    },
  });

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetInvocation(
  invocationId: string,
  options?: HookQueryOptions<'/query/invocations/{invocationId}', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/invocations/{invocationId}',
    'get',
    {
      baseUrl,
      parameters: { path: { invocationId } },
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetInvocationJournal(
  invocationId: string,
  options?: HookQueryOptions<'/query/invocations/{invocationId}/journal', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/invocations/{invocationId}/journal',
    'get',
    {
      baseUrl,
      parameters: { path: { invocationId } },
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetInvocationJournalWithInvocation(
  invocationId: string,
  options?: HookQueryOptions<'/query/invocations/{invocationId}/journal', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const results = useQueries({
    queries: [
      {
        ...adminApi(
          'query',
          '/query/invocations/{invocationId}/journal',
          'get',
          {
            baseUrl,
            parameters: { path: { invocationId } },
          }
        ),
        ...options,
      },
      {
        ...adminApi('query', '/query/invocations/{invocationId}', 'get', {
          baseUrl,
          parameters: { path: { invocationId } },
        }),
        refetchOnMount: options?.refetchOnMount !== false,
        enabled: options?.enabled !== false,
        staleTime: 0,
      },
    ],
    combine: ([journalResults, invocationResults]) => {
      return {
        ...(journalResults.data &&
          invocationResults.data && {
            data: {
              journal: journalResults.data,
              invocation: invocationResults.data,
            },
          }),
        isPending: journalResults.isPending || invocationResults.isPending,
        isSuccess: journalResults.isSuccess && invocationResults.isSuccess,
        dataUpdatedAt: Math.max(
          journalResults.dataUpdatedAt,
          invocationResults.dataUpdatedAt
        ),
        error: journalResults.error || invocationResults.error,
      };
    },
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey.at(0) === '/query/invocations'
          );
        },
      },
      (oldData: ReturnType<typeof useListInvocations>['data']) => {
        const newInvocation = results.data?.invocation;
        if (!oldData || !newInvocation) {
          return oldData;
        } else {
          return {
            ...oldData,
            rows: oldData.rows.map((oldInvocation) => {
              if (oldInvocation.id === newInvocation.id) {
                return newInvocation;
              } else {
                return oldInvocation;
              }
            }),
          };
        }
      }
    );
  }, [queryClient, results]);

  return results;
}

export function useGetVirtualObjectQueue(
  serviceName: string,
  key: string,
  invocationId: string,
  options?: HookQueryOptions<
    '/query/virtualObjects/{name}/keys/{key}/queue',
    'get'
  >
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/virtualObjects/{name}/keys/{key}/queue',
    'get',
    {
      baseUrl,
      parameters: { path: { key, name: serviceName }, query: { invocationId } },
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetVirtualObjectState(
  serviceName: string,
  key: string,
  options?: HookQueryOptions<'/query/services/{name}/keys/{key}/state', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/services/{name}/keys/{key}/state',
    'get',
    {
      baseUrl,
      parameters: { path: { key, name: serviceName } },
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useQueryVirtualObjectState(
  serviceName: string,
  page: number,
  sort?: {
    field: string;
    order: 'ASC' | 'DESC';
  },
  filters?: FilterItem[],
  options?: HookQueryOptions<'/query/services/{name}/state', 'post'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/services/{name}/state',
    'post',
    {
      baseUrl,
      parameters: { path: { name: serviceName } },
      body: {
        filters,
        page,
        sort,
      },
      resolvedPath: `/query/services/${serviceName}/state`,
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetVirtualObjectStateInterface(
  serviceName: string,
  options?: HookQueryOptions<'/query/services/{name}/state/keys', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/services/{name}/state/keys',
    'get',
    {
      baseUrl,
      parameters: { path: { name: serviceName } },
    }
  );

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useGetStateInterface(
  options?: HookQueryOptions<'/query/services/state', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/query/services/state', 'get', {
    baseUrl,
  });

  const results = useQuery({
    ...queryOptions,
    ...options,
  });

  return {
    ...results,
    queryKey: queryOptions.queryKey,
  };
}

export function useDeleteInvocation(
  invocation_id: string,
  options?: HookMutationOptions<'/invocations/{invocation_id}', 'delete'>
) {
  const baseUrl = useAdminBaseUrl();

  return useMutation({
    ...adminApi('mutate', '/invocations/{invocation_id}', 'delete', {
      baseUrl,
      resolvedPath: `/invocations/${invocation_id}`,
    }),
    ...options,
  });
}

function convertStateToUnit8Array(state: Record<string, string>) {
  return Object.entries(state).reduce(
    (results, [k, v]) => ({
      ...results,
      [k]: Array.from(new TextEncoder().encode(v)),
    }),
    {} as Record<string, number[]>
  );
}

export function convertStateToObject(
  state: { name: string; value: string; bytes: string }[]
) {
  return state.reduce(
    (p, c) => ({ ...p, [c.name]: c.value }),
    {} as Record<string, string>
  );
}

export function useEditState(
  service: string,
  objectKey: string,
  options?: HookMutationOptions<'/services/{service}/state', 'post'>
) {
  const baseUrl = useAdminBaseUrl();

  const queryOptions = adminApi(
    'query',
    '/query/services/{name}/keys/{key}/state',
    'get',
    {
      baseUrl,
      parameters: { path: { key: objectKey, name: service } },
    }
  );

  const query = useQuery(queryOptions);

  const { mutationFn, mutationKey, meta } = adminApi(
    'mutate',
    '/services/{service}/state',
    'post',
    {
      baseUrl,
      resolvedPath: `/services/${service}/state`,
    }
  );

  const mutate = (variables: {
    state: Record<string, string>;
    partial?: boolean;
  }) => {
    if (!query.data?.version) {
      throw new RestateError(
        'Modifying the state is only allowed in an HTTPS context.'
      );
    }
    return mutationFn({
      parameters: { path: { service } },
      body: {
        object_key: objectKey,
        version: query.data?.version,
        new_state: {
          ...(variables.partial && {
            ...convertStateToUnit8Array(convertStateToObject(query.data.state)),
          }),
          ...convertStateToUnit8Array(variables.state),
        },
      },
    }).then(async (res) => {
      const { data: newData } = await query.refetch();
      const newMergedState = convertStateToObject(newData?.state ?? []);
      const isStateUpdated = Array.from(Object.keys(variables.state)).every(
        (key) => variables.state[key] === newMergedState?.[key]
      );
      if (!isStateUpdated) {
        throw new RestateError(
          'Changes were made to the state prior to your update attempt. Please sync to the latest version to continue.'
        );
      }

      return newData?.state;
    });
  };

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: mutate,
    mutationKey,
    meta,
    onSuccess(data, variables, context) {
      options?.onSuccess?.(data, variables, context);
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            return (
              Array.isArray(query.queryKey) &&
              query.queryKey.at(0) === `/query/services/${service}/state`
            );
          },
        },
        (oldData: ReturnType<typeof useQueryVirtualObjectState>['data']) => {
          if (!oldData || !data) {
            return oldData;
          } else {
            return {
              ...oldData,
              objects: oldData.objects.map((oldObject) => {
                if (oldObject.key === objectKey) {
                  return {
                    ...oldObject,
                    state: data,
                  };
                } else {
                  return oldObject;
                }
              }),
            };
          }
        }
      );
    },
  });

  return { mutation, query };
}
