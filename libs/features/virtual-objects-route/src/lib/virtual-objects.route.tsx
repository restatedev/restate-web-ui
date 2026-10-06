import { useFeatures } from '@restate/data-access/admin-api';
import { useListServices } from '@restate/data-access/admin-api-hooks';
import { ContentPanel, type ContentPanelTabs } from '@restate/ui/content-panel';
import { IconName } from '@restate/ui/icons';
import { ListPageHeader } from '@restate/ui/layout';
import { Link } from '@restate/ui/link';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { VirtualObjectInstances } from './VirtualObjectInstances';

const SERVICE_QUERY_PARAM = 'service';
const MAX_VISIBLE_SERVICE_TABS = 5;

function VirtualObjectsHeader({
  hasScopedVirtualObjects,
}: {
  hasScopedVirtualObjects: boolean;
}) {
  const identityDescription = hasScopedVirtualObjects
    ? 'a service, key, and optional scope'
    : 'a service and key';

  return (
    <ListPageHeader icon={IconName.VirtualObject} title="Virtual Objects">
      Virtual Objects are stateful entities identified by {identityDescription}.
      Each instance has persistent K/V state. Restate runs at most one exclusive
      handler at a time per instance, while shared handlers can run
      concurrently.{' '}
      <Link
        href="https://docs.restate.dev/foundations/services#virtual-object"
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
  const features = useFeatures();
  const hasScopedVirtualObjects =
    features.has('vqueues') && features.has('scoped_virtual_objects');
  const {
    data: serviceData,
    isPending: isServicesPending,
    error: servicesError,
  } = useListServices();
  const services = useMemo(
    () =>
      Array.from(serviceData.values())
        .filter((service) => service.ty === 'VirtualObject')
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
            maxVisible: MAX_VISIBLE_SERVICE_TABS,
          }
        : undefined,
    [services],
  );
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <VirtualObjectsHeader hasScopedVirtualObjects={hasScopedVirtualObjects} />
      <ContentPanel
        tabs={tabs}
        className="sm:[&_[data-cp-slot=toolbar]]:min-w-[min(28rem,40vw)]"
      >
        <VirtualObjectInstances
          service={selectedService}
          hasServices={services.length > 0}
          isServicesPending={isServicesPending}
          servicesError={servicesError}
        />
      </ContentPanel>
    </div>
  );
}

export const virtualObjects = { Component };
