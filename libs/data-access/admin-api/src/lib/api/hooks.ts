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
      deployment.services.forEach((service) => {
        let { deployments: serviceDeployments, sortedRevisions } =
          services.get(service.name) ?? {};
        serviceDeployments = {
          ...serviceDeployments,
          [service.revision]: deployment.id,
        };
        sortedRevisions = [...(sortedRevisions ?? []), service.revision].sort(
          (a, b) => b - a
        );
        services.set(service.name, {
          deployments: serviceDeployments,
          sortedRevisions,
        });

        deployments.set(deployment.id, deployment);
      });
      return { services, deployments };
    },
    {
      services: new Map<
        ServiceName,
        {
          deployments: Record<Revision, DeploymentId>;
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

  return useQuery({
    ...adminApi('query', '/services/{service}', 'get', {
      baseUrl,
      parameters: { path: { service } },
    }),
    ...options,
  });
}
