import {
  getEndpoint,
  type Deployment,
  type Service,
} from '@restate/data-access/admin-api-spec';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { panelHref } from '@restate/util/panel';
import { useNavigate } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import { ServiceCard } from './ServiceCard';
import { sortServices } from './sortServices';

export function ServicesGridList() {
  const {
    filter,
    servicesMap,
    deploymentsMap,
    summaryData,
    byServiceAndStatus,
    invocationCounts,
    serviceIssuesMap,
    isSummaryError,
    isSummaryLoading,
    isDeploymentsFetching,
    baseUrl,
    linkParams,
    resolvedServiceSortDescriptor,
    setServiceSortDescriptor,
  } = useOverviewContext();

  const filteredServices = getFilteredServices({
    servicesMap,
    deploymentsMap,
    serviceFilter: filter.trim().toLowerCase(),
  });
  const services = sortServices(
    filteredServices,
    resolvedServiceSortDescriptor,
    invocationCounts,
    serviceIssuesMap,
    deploymentsMap,
  );

  const navigate = useNavigate();

  return (
    <GridList
      aria-label="Services"
      columns={[]}
      items={services}
      dependencies={[serviceIssuesMap, summaryData, isSummaryLoading]}
      sortDescriptor={resolvedServiceSortDescriptor}
      onSortChange={setServiceSortDescriptor}
      onAction={(key) => navigate(panelHref({ service: String(key) }))}
      estimatedRowHeight={120}
      className="[--grid-list-template-columns:1fr]"
      headerClassName="hidden"
    >
      {(service) => (
        <GridListItem id={service.name} item={service} textValue={service.name}>
          {({ isFocusVisible, isHovered, isPressed }) => {
            const issues = serviceIssuesMap.get(service.name) ?? [];
            const issueSeverity = issues.some(
              (issue) => issue.severity === 'high',
            )
              ? ('high' as const)
              : issues.length > 0
                ? ('low' as const)
                : ('none' as const);

            return (
              <ServiceCard
                service={service}
                summaryData={summaryData}
                byServiceAndStatus={byServiceAndStatus}
                baseUrl={baseUrl}
                serviceIssues={issues}
                isSummaryError={isSummaryError}
                isSummaryLoading={isSummaryLoading}
                isDeploymentsFetching={isDeploymentsFetching}
                linkParams={linkParams}
                isFocusVisible={isFocusVisible}
                isHovered={isHovered}
                isPressed={isPressed}
                issueSeverity={issueSeverity}
              />
            );
          }}
        </GridListItem>
      )}
    </GridList>
  );
}

function getFilteredServices({
  servicesMap,
  deploymentsMap,
  serviceFilter,
}: {
  servicesMap?: Map<string, Service>;
  deploymentsMap?: Map<string, Deployment>;
  serviceFilter: string;
}) {
  const allServices = Array.from(servicesMap?.values() ?? []);

  if (serviceFilter.length === 0) {
    return allServices;
  }

  return allServices.filter((service) => {
    if (
      service.name.toLowerCase().includes(serviceFilter) ||
      service.ty.toLowerCase().includes(serviceFilter) ||
      getEndpoint(deploymentsMap?.get(service.deployment_id))
        ?.toLowerCase()
        .includes(serviceFilter)
    ) {
      return true;
    }
    return service.handlers.some((handler) =>
      handler.name.toLowerCase().includes(serviceFilter),
    );
  });
}
