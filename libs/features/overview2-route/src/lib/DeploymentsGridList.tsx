import {
  getEndpoint,
  type Deployment,
} from '@restate/data-access/admin-api-spec';
import { DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import { DeploymentServicesList } from './DeploymentServicesList';
import { useOverviewContext } from './OverviewContext';
import { OverviewCard } from './OverviewCard';
import { cellsContainerStyles } from './cellsContainerStyles';
import { useDeploymentColumns } from './columns';
import {
  type OverviewDeployment,
  type OverviewDeploymentService,
  sortDeployments,
  sortDeploymentServices,
} from './sortDeployments';

export function DeploymentsGridList() {
  const {
    filter,
    deploymentsMap,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    baseUrl,
    linkParams,
    resolvedDeploymentSortDescriptor,
    setDeploymentSortDescriptor,
  } = useOverviewContext();

  const { filteredDeploymentServicesMap, filteredDeployments } =
    getFilteredDeployments({
      deploymentsMap,
      drainedDeploymentIds,
      serviceFilter: filter.trim().toLowerCase(),
    });
  const deployments = sortDeployments(
    filteredDeployments,
    resolvedDeploymentSortDescriptor,
  );

  const deploymentColumns = useDeploymentColumns({
    isDeploymentStatusLoading,
    baseUrl,
    linkParams,
  });

  return (
    <GridList
      aria-label="Deployments"
      columns={deploymentColumns}
      items={deployments}
      dependencies={[deploymentColumns, isDeploymentStatusLoading]}
      sortDescriptor={resolvedDeploymentSortDescriptor}
      onSortChange={setDeploymentSortDescriptor}
      estimatedRowHeight={100}
      className="[--grid-list-template-columns:1fr] md:[--grid-list-template-columns:2fr_1fr_1fr]"
      headerClassName="hidden"
    >
      {(deployment) => (
        <GridListItem
          id={deployment.id}
          item={deployment}
          textValue={getEndpoint(deployment) ?? deployment.id}
          href={`?${DEPLOYMENT_QUERY_PARAM}=${deployment.id}`}
        >
          {({ cells, isFocusVisible }) => {
            const visibleServices =
              filteredDeploymentServicesMap.get(deployment.id) ??
              sortDeploymentServices(deployment.services);

            return (
              <OverviewCard
                {...waveAnimationProps('overview-card')}
                cells={cells}
                className={cellsContainerStyles({
                  isFocusVisible,
                  className: 'relative hover:bg-gray-50',
                })}
                detailsTitle={
                  visibleServices.length > 0 ? 'Services' : undefined
                }
                detailsContent={
                  visibleServices.length > 0 ? (
                    <div className="px-8">
                      <DeploymentServicesList
                        services={visibleServices}
                        className="flex flex-col gap-1 px-1 opacity-90 xl:grid xl:grid-cols-2 xl:justify-items-start xl:gap-x-2"
                      />
                    </div>
                  ) : undefined
                }
              />
            );
          }}
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
  const filteredDeploymentServicesMap = new Map<
    string,
    OverviewDeploymentService[]
  >();
  const allDeployments: OverviewDeployment[] = Array.from(
    deploymentsMap?.values() ?? [],
  ).map((deployment) => ({
    ...deployment,
    status: drainedDeploymentIds.has(deployment.id) ? 'drained' : 'active',
  }));

  if (serviceFilter.length === 0) {
    return {
      filteredDeploymentServicesMap,
      filteredDeployments: allDeployments,
    };
  }

  const filteredDeployments = allDeployments.filter((deployment) => {
    const deploymentMatches =
      deployment.id.toLowerCase().includes(serviceFilter) ||
      deployment.status.includes(serviceFilter) ||
      getEndpoint(deployment)?.toLowerCase().includes(serviceFilter);
    if (deploymentMatches) return true;
    const matchedServices = sortDeploymentServices(deployment.services).filter(
      (service) =>
        service.name.toLowerCase().includes(serviceFilter) ||
        String(service.revision).includes(serviceFilter),
    );
    if (matchedServices.length > 0) {
      filteredDeploymentServicesMap.set(deployment.id, matchedServices);
      return true;
    }
    return false;
  });

  return {
    filteredDeploymentServicesMap,
    filteredDeployments,
  };
}
