import {
  getEndpoint,
  type Deployment,
} from '@restate/data-access/admin-api-spec';
import { panelHref } from '@restate/util/panel';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { useNavigate } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import { DeploymentCard } from './DeploymentCard';
import {
  type OverviewDeployment,
  sortDeployments,
  sortDeploymentServices,
} from './sortDeployments';

export function DeploymentsGridList() {
  const {
    filter,
    deploymentsMap,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    isDeploymentsFetching,
    baseUrl,
    linkParams,
    resolvedDeploymentSortDescriptor,
    setDeploymentSortDescriptor,
  } = useOverviewContext();

  const filteredDeployments = getFilteredDeployments({
    deploymentsMap,
    drainedDeploymentIds,
    serviceFilter: filter.trim().toLowerCase(),
  });
  const deployments = sortDeployments(
    filteredDeployments,
    resolvedDeploymentSortDescriptor,
  );
  const navigate = useNavigate();

  return (
    <GridList
      aria-label="Deployments"
      columns={[]}
      items={deployments}
      dependencies={[isDeploymentStatusLoading]}
      sortDescriptor={resolvedDeploymentSortDescriptor}
      onSortChange={setDeploymentSortDescriptor}
      onAction={(key) => navigate(panelHref({ deployment: String(key) }))}
      estimatedRowHeight={50}
      virtualized
      className="[--grid-list-template-columns:1fr]"
      headerClassName="hidden"
    >
      {(deployment) => (
        <GridListItem
          id={deployment.id}
          item={deployment}
          textValue={getEndpoint(deployment) ?? deployment.id}
        >
          {({ isFocusVisible, isHovered, isPressed }) => (
            <DeploymentCard
              deployment={deployment}
              isDeploymentStatusLoading={isDeploymentStatusLoading}
              isDeploymentsFetching={isDeploymentsFetching}
              baseUrl={baseUrl}
              linkParams={linkParams}
              isFocusVisible={isFocusVisible}
              isHovered={isHovered}
              isPressed={isPressed}
            />
          )}
        </GridListItem>
      )}
    </GridList>
  );
}

function getFilteredDeployments({
  deploymentsMap,
  drainedDeploymentIds,
  serviceFilter,
}: {
  deploymentsMap?: Map<string, Deployment>;
  drainedDeploymentIds: Set<string>;
  serviceFilter: string;
}) {
  const allDeployments: OverviewDeployment[] = Array.from(
    deploymentsMap?.values() ?? [],
  ).map((deployment) => ({
    ...deployment,
    status: drainedDeploymentIds.has(deployment.id) ? 'drained' : 'active',
  }));

  if (serviceFilter.length === 0) {
    return allDeployments;
  }

  return allDeployments.filter((deployment) => {
    if (
      deployment.id.toLowerCase().includes(serviceFilter) ||
      deployment.status.includes(serviceFilter) ||
      getEndpoint(deployment)?.toLowerCase().includes(serviceFilter)
    ) {
      return true;
    }
    return sortDeploymentServices(deployment.services).some(
      (service) =>
        service.name.toLowerCase().includes(serviceFilter) ||
        String(service.revision).includes(serviceFilter),
    );
  });
}
