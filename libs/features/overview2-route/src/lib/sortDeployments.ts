import {
  getEndpoint,
  type Deployment,
} from '@restate/data-access/admin-api-spec';
import type { SortDescriptor } from 'react-aria-components';

export type DeploymentStatus = 'active' | 'drained';

export type OverviewDeployment = Deployment & {
  status: DeploymentStatus;
};

const deploymentStatusOrder: Record<DeploymentStatus, number> = {
  active: 0,
  drained: 1,
};

export function sortDeployments(
  deployments: OverviewDeployment[],
  descriptor: SortDescriptor,
) {
  const { column, direction } = descriptor;
  const modifier = direction === 'descending' ? -1 : 1;

  return [...deployments].sort((a, b) => {
    switch (column) {
      case 'deployment':
        return (
          modifier * getDeploymentLabel(a).localeCompare(getDeploymentLabel(b))
        );
      case 'status':
        return (
          modifier *
          (deploymentStatusOrder[a.status] - deploymentStatusOrder[b.status])
        );
      case 'created_at':
        return (
          modifier *
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        );
      default:
        return 0;
    }
  });
}

function getDeploymentLabel(deployment: Deployment) {
  return getEndpoint(deployment) ?? deployment.id;
}
