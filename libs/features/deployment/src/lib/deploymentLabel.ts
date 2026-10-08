import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import {
  type Deployment,
  type DeploymentId,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { IconName } from '@restate/ui/icons';

type Tunnel = ReturnType<typeof useRestateContext>['tunnel'];

export function formatDeploymentLabel(endpoint: string): string {
  if (endpoint.startsWith('arn:')) {
    return endpoint.split(':function:')[1] || endpoint;
  }
  return endpoint.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/$/, '');
}

export function resolveDeploymentEndpoint(
  deployment: Deployment | undefined,
  tunnel: Tunnel,
) {
  const tunnelEndpoint =
    tunnel?.isEnabled && deployment && isHttpDeployment(deployment)
      ? tunnel.fromHttp(deployment.uri)
      : undefined;
  const endpoint = tunnelEndpoint
    ? tunnelEndpoint.remoteUrl
    : getEndpoint(deployment);

  return {
    endpoint,
    label: endpoint ? formatDeploymentLabel(endpoint) : tunnelEndpoint?.name,
    isTunnel: Boolean(tunnelEndpoint),
    tunnelName: tunnelEndpoint?.name,
    icon: tunnelEndpoint
      ? IconName.Tunnel
      : deployment && !isHttpDeployment(deployment)
        ? IconName.Lambda
        : IconName.Http,
  };
}

export function useDeploymentLabel(deploymentId?: DeploymentId) {
  const { tunnel } = useRestateContext();
  const { data, isPending } = useListDeployments({ refetchOnMount: false });
  const deployment = deploymentId
    ? data?.deployments.get(deploymentId)
    : undefined;

  return {
    ...resolveDeploymentEndpoint(deployment, tunnel),
    isPending: !deployment && isPending,
  };
}
