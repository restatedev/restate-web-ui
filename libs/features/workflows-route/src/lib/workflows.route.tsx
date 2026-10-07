import { useListServices } from '@restate/data-access/admin-api-hooks';
import {
  ContentPanel,
  type ContentPanelTabs,
  isTabStateParam,
} from '@restate/ui/content-panel';
import { IconName } from '@restate/ui/icons';
import { ListPageHeader } from '@restate/ui/layout';
import { Link } from '@restate/ui/link';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { WorkflowRuns } from './WorkflowRuns';

const SERVICE_QUERY_PARAM = 'service';
const MAX_VISIBLE_SERVICE_TABS = 5;

function WorkflowsHeader() {
  return (
    <ListPageHeader icon={IconName.Workflow} title="Workflows">
      Workflows are durable, multi-step processes identified by a service and
      workflow ID. Each workflow retains isolated state, its run handler
      executes exactly once for that identity, and other handlers can interact
      with it concurrently.{' '}
      <Link
        href="https://docs.restate.dev/foundations/services#workflow"
        variant="secondary"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more
      </Link>
    </ListPageHeader>
  );
}

function Component() {
  const [searchParams] = useSearchParams();
  const {
    data: serviceData,
    isPending: isServicesPending,
    error: servicesError,
  } = useListServices();
  const services = useMemo(
    () =>
      Array.from(serviceData.values())
        .filter((service) => service.ty === 'Workflow')
        .map((service) => service.name),
    [serviceData],
  );
  const requestedService = searchParams.get(SERVICE_QUERY_PARAM);
  const selectedService =
    services.find((service) => service === requestedService) ??
    services.at(0) ??
    '';
  const tabs = useMemo<ContentPanelTabs | undefined>(
    () =>
      services.length > 0
        ? {
            items: services.map((service) => ({
              id: service,
              label: (
                <span className="block max-w-[18ch]">
                  <TruncateWithTooltip hideCopy tooltipContent={service}>
                    {service}
                  </TruncateWithTooltip>
                </span>
              ),
              menuLabel: service,
            })),
            defaultId: services.at(0),
            queryParam: SERVICE_QUERY_PARAM,
            stateParams: isTabStateParam,
            maxVisible: MAX_VISIBLE_SERVICE_TABS,
          }
        : undefined,
    [services],
  );
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <WorkflowsHeader />
      <ContentPanel
        tabs={tabs}
        className="sm:[&_[data-cp-slot=toolbar]]:min-w-[min(28rem,40vw)]"
      >
        <WorkflowRuns
          service={selectedService}
          hasServices={services.length > 0}
          isServicesPending={isServicesPending}
          servicesError={servicesError}
        />
      </ContentPanel>
    </div>
  );
}

export const workflows = { Component };
