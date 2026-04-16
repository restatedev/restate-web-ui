import {
  getEndpoint,
  type Deployment,
  type Service,
} from '@restate/data-access/admin-api-spec';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import {
  HANDLER_QUERY_PARAM,
  HandlerList,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { useOverviewContext } from './OverviewContext';
import { OverviewCard, cellsContainerStyles } from './OverviewCard';
import { useServiceColumns } from './columns';
import { sortServices } from './sortServices';

export function ServicesGridList() {
  const {
    filter,
    servicesMap,
    deploymentsMap,
    byServiceAndStatus,
    invocationCounts,
    serviceIssuesMap,
    isSummaryError,
    isSummaryLoading,
    baseUrl,
    linkParams,
    resolvedServiceSortDescriptor,
    setServiceSortDescriptor,
  } = useOverviewContext();

  const { filteredHandlersMap, filteredServices } = getFilteredServices({
    servicesMap,
    deploymentsMap,
    serviceFilter: filter.trim().toLowerCase(),
  });
  const services = sortServices(
    filteredServices,
    resolvedServiceSortDescriptor,
    invocationCounts,
    serviceIssuesMap,
  );

  const serviceColumns = useServiceColumns({
    byServiceAndStatus,
    baseUrl,
    serviceIssuesMap,
    isSummaryError,
    isSummaryLoading,
    linkParams,
  });

  return (
    <GridList
      aria-label="Services"
      columns={serviceColumns}
      items={services}
      dependencies={[serviceIssuesMap, serviceColumns]}
      sortDescriptor={resolvedServiceSortDescriptor}
      onSortChange={setServiceSortDescriptor}
      estimatedRowHeight={100}
      className="[--grid-list-template-columns:1fr] md:[--grid-list-template-columns:1.5fr_1.5fr_1fr]"
      headerClassName="hidden"
    >
      {(service) => (
        <GridListItem id={service.name} item={service} textValue={service.name}>
          {({ cells, isFocusVisible }) => {
            const issues = serviceIssuesMap.get(service.name) ?? [];
            const issueSeverity = issues.some(
              (issue) => issue.severity === 'high',
            )
              ? ('high' as const)
              : issues.length > 0
                ? ('low' as const)
                : ('none' as const);
            const visibleHandlers =
              filteredHandlersMap.get(service.name) ?? service.handlers;

            return (
              <OverviewCard
                {...waveAnimationProps('overview-card')}
                cells={cells}
                primaryHref={`?${SERVICE_QUERY_PARAM}=${service.name}&${HANDLER_QUERY_PARAM}`}
                className={cellsContainerStyles({
                  isFocusVisible,
                  issueSeverity,
                })}
                detailsTitle={
                  visibleHandlers.length > 0 ? 'Handlers' : undefined
                }
                detailsContent={
                  visibleHandlers.length > 0 ? (
                    <HandlerList
                      serviceName={service.name}
                      handlers={visibleHandlers}
                      serviceType={service.ty}
                      className="flex flex-col gap-1 px-5 opacity-90 @3xl:grid @3xl:grid-cols-[1.5fr_2.5fr] @3xl:gap-x-6"
                    />
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
  const filteredHandlersMap = new Map<string, Service['handlers']>();

  if (serviceFilter.length === 0) {
    return {
      filteredHandlersMap,
      filteredServices: allServices,
    };
  }

  const filteredServices = allServices.filter((service) => {
    const serviceMatches =
      service.name.toLowerCase().includes(serviceFilter) ||
      service.ty.toLowerCase().includes(serviceFilter) ||
      getEndpoint(deploymentsMap?.get(service.deployment_id))
        ?.toLowerCase()
        .includes(serviceFilter);
    if (serviceMatches) return true;
    const matchedHandlers = service.handlers.filter((handler) =>
      handler.name.toLowerCase().includes(serviceFilter),
    );
    if (matchedHandlers.length > 0) {
      filteredHandlersMap.set(service.name, matchedHandlers);
      return true;
    }
    return false;
  });

  return {
    filteredHandlersMap,
    filteredServices,
  };
}
