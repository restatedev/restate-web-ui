import type { paths, components } from './index'; // generated by openapi-typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  adminApi,
  MutationOptions,
  OperationBody,
  OperationParameters,
  QueryOptions,
  SupportedMethods,
} from './client';
import { useAdminBaseUrl } from '../AdminBaseUrlProvider';
import type { DeploymentId, Revision, ServiceName, Deployment } from './type';

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
    const aDeployment = deployments.get(a);
    const bDeployment = deployments.get(b);
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

  return useQuery({
    ...adminApi('query', '/deployments', 'get', { baseUrl }),
    ...options,
    select: listDeploymentsSelector,
  });
}

export function useHealth(options?: HookQueryOptions<'/health', 'get'>) {
  const baseUrl = useAdminBaseUrl();

  return useQuery({
    ...adminApi('query', '/health', 'get', { baseUrl }),
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
  options?: HookQueryOptions<'/query/invocations', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/query/invocations', 'get', {
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

export function useGetVirtualObjectInbox(
  key: string,
  invocationId: string,
  options?: HookQueryOptions<'/query/virtualObjects/{key}/inbox', 'get'>
) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi(
    'query',
    '/query/virtualObjects/{key}/inbox',
    'get',
    {
      baseUrl,
      parameters: { path: { key }, query: { invocationId } },
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
