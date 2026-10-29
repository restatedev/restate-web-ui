import { useListDeployments } from '@restate/data-access-admin-api-hooks';
import {
  type Deployment,
  type DeploymentId,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access-admin-api-spec';
import { useRestateContext } from '@restate/features-restate-context';
import { IconName } from '@restate/ui-icons';

type Tunnel = ReturnType<typeof useRestateContext>['tunnel'];

export function formatDeploymentLabel(endpoint: string): string {
  if (endpoint.startsWith('arn:')) {
    return endpoint.split(':function:')[1] || endpoint;
  }
  return endpoint.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/$/, '');
}

function relayDeploymentLabel(deployment: Deployment | undefined) {
  const metadata = deployment?.metadata;
  const image = metadata?.['modal.image'];
  if (image) {
    return { label: `Modal · ${image}`, icon: IconName.Modal };
  }
  const relayTunnel = metadata?.['relay.tunnel'];
  const relayVersion = metadata?.['relay.version'];
  if (relayTunnel && relayVersion) {
    return { label: `${relayTunnel} @ ${relayVersion}`, icon: IconName.Tunnel };
  }
  return undefined;
}

export function resolveDeploymentEndpoint(
  deployment: Deployment | undefined,
  tunnel: Tunnel,
) {
  const relay = relayDeploymentLabel(deployment);
  if (relay) {
    return {
      endpoint: relay.label,
      label: relay.label,
      isTunnel: false,
      tunnelName: undefined,
      icon: relay.icon,
    };
  }
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
