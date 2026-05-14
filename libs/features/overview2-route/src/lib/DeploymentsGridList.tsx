import {
  getEndpoint,
  type Deployment,
} from '@restate/data-access/admin-api-spec';
import { panelHref } from '@restate/util/panel';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { Icon, IconName } from '@restate/ui/icons';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import { formatNumber } from '@restate/util/intl';
import { useState } from 'react';
import { DeploymentServicesList } from './DeploymentServicesList';
import { useOverviewContext } from './OverviewContext';
import { OverviewCard, cellsContainerStyles } from './OverviewCard';
import { useDeploymentColumns } from './columns';
import {
  type OverviewDeployment,
  type OverviewDeploymentService,
  sortDeployments,
  sortDeploymentServices,
} from './sortDeployments';

const INITIAL_VISIBLE_DEPLOYMENTS = 100;
const DEPLOYMENT_COUNT_OPTIONS = ['100', '200', '500', 'all'] as const;

function getVisibleDeploymentCount(
  option: (typeof DEPLOYMENT_COUNT_OPTIONS)[number],
  total: number,
) {
  return option === 'all' ? total : Number(option);
}

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
  const [visibleCountOption, setVisibleCountOption] =
    useState<(typeof DEPLOYMENT_COUNT_OPTIONS)[number]>('100');
  const visibleCount = getVisibleDeploymentCount(
    visibleCountOption,
    deployments.length,
  );
  const visibleDeployments = deployments.slice(0, visibleCount);

  const deploymentColumns = useDeploymentColumns({
    isDeploymentStatusLoading,
    isDeploymentsFetching,
    baseUrl,
    linkParams,
  });

  return (
    <div className="flex flex-col gap-3">
      <GridList
        aria-label="Deployments"
        columns={deploymentColumns}
        items={visibleDeployments}
        dependencies={[deploymentColumns, isDeploymentStatusLoading]}
        sortDescriptor={resolvedDeploymentSortDescriptor}
        onSortChange={setDeploymentSortDescriptor}
        estimatedRowHeight={100}
        className="[--grid-list-template-columns:2fr_1fr] md:[--grid-list-template-columns:2fr_1fr_1fr]"
        headerClassName="hidden"
      >
        {(deployment) => (
          <GridListItem
            id={deployment.id}
            item={deployment}
            textValue={getEndpoint(deployment) ?? deployment.id}
          >
            {({ cells, isFocusVisible }) => {
              const visibleServices =
                filteredDeploymentServicesMap.get(deployment.id) ??
                sortDeploymentServices(deployment.services);

              return (
                <OverviewCard
                  {...waveAnimationProps('overview-card')}
                  cells={cells}
                  primaryHref={panelHref({ deployment: deployment.id })}
                  className={cellsContainerStyles({
                    isFocusVisible,
                  })}
                  detailsTitle={
                    visibleServices.length > 0 ? 'Services' : undefined
                  }
                  detailsContent={
                    visibleServices.length > 0 ? (
                      <div className="px-6">
                        <DeploymentServicesList
                          services={visibleServices}
                          className="flex flex-col gap-1 px-1 opacity-90 @3xl:grid @3xl:grid-cols-2 @3xl:justify-items-start @3xl:gap-x-2"
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
      {deployments.length > INITIAL_VISIBLE_DEPLOYMENTS ? (
        <div className="-mt-5 flex items-center gap-1 px-4 text-0.5xs text-gray-500">
          <span>Showing</span>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="icon"
                className="h-auto gap-1 rounded-md px-1.5 py-0.5 text-0.5xs font-medium text-gray-700 hover:bg-black/5"
              >
                {visibleCountOption === 'all'
                  ? 'All'
                  : formatNumber(Number(visibleCountOption))}
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-[1em] w-[1em] text-gray-400"
                />
              </Button>
            </DropdownTrigger>
            <DropdownPopover>
              <DropdownSection title="Visible deployments">
                <DropdownMenu
                  selectable
                  selectedItems={[visibleCountOption]}
                  onSelect={(key) =>
                    setVisibleCountOption(
                      key as (typeof DEPLOYMENT_COUNT_OPTIONS)[number],
                    )
                  }
                  aria-label="Visible deployments"
                >
                  {DEPLOYMENT_COUNT_OPTIONS.map((option) => (
                    <DropdownItem key={option} value={option}>
                      {option === 'all' ? 'All' : formatNumber(Number(option))}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </DropdownSection>
            </DropdownPopover>
          </Dropdown>
          <span className="-ml-1.5 inline-block">
            of {formatNumber(deployments.length)} deployments
          </span>
        </div>
      ) : null}
    </div>
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
