import {
  useListDeployments,
  useListStateServices,
  useListServices,
} from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { issueAlertIconStyles } from '@restate/ui/issue-banner';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useRestateContext } from '@restate/features/restate-context';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import invariant from 'tiny-invariant';

export type StateRouteServiceType = 'virtual_object' | 'workflow';

type StateRouteService = {
  name: string;
  serviceType?: StateRouteServiceType;
  hasState: boolean;
};

const stateOnlyServiceWarning = 'Service no longer registered';

export function StateOnlyServiceWarningIcon({
  tooltip = true,
}: {
  tooltip?: boolean;
}) {
  const icon = (
    <span
      role="img"
      aria-label={stateOnlyServiceWarning}
      title={tooltip ? undefined : stateOnlyServiceWarning}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
    >
      <Icon
        name={IconName.TriangleAlert}
        className={`${issueAlertIconStyles({ severity: 'low' })} h-3.5 w-3.5`}
      />
    </span>
  );

  if (!tooltip) {
    return icon;
  }

  return (
    <HoverTooltip
      content={stateOnlyServiceWarning}
      placement="top"
      className="inline-flex shrink-0"
    >
      {icon}
    </HoverTooltip>
  );
}

export function getStateServiceSearch(searchParams: URLSearchParams) {
  const newSearchParams = new URLSearchParams(searchParams);
  Array.from(newSearchParams.keys())
    .filter((key) => key.startsWith('filter_') || key.startsWith('sysFilter_'))
    .forEach((key) => newSearchParams.delete(key));

  return newSearchParams.toString();
}

export function getStateServiceHref({
  baseUrl,
  service,
  searchParams,
}: {
  baseUrl: string;
  service: string;
  searchParams: URLSearchParams;
}) {
  const search = getStateServiceSearch(searchParams);
  return `${baseUrl}/state/${encodeURIComponent(service)}${
    search ? `?${search}` : ''
  }`;
}

function getStateRouteServiceType(
  serviceType: string | undefined,
): StateRouteServiceType | undefined {
  if (serviceType === 'VirtualObject') return 'virtual_object';
  if (serviceType === 'Workflow') return 'workflow';
  return undefined;
}

export function getDefaultStateService(services: string[]) {
  if (typeof window !== 'undefined') {
    const previousSelectedState = localStorage.getItem('state_last_service');
    return previousSelectedState && services.includes(previousSelectedState)
      ? previousSelectedState
      : services.at(0);
  }
  return services.at(0);
}

export function useStateServiceCatalog() {
  const { data: deployments, isPending: isDeploymentsPending } =
    useListDeployments();
  const deploymentServiceNames = useMemo(
    () => Array.from(deployments?.services.keys() ?? []).sort(),
    [deployments],
  );
  const deploymentServicesPlaceholder = useMemo(
    () =>
      deploymentServiceNames.length > 0
        ? { services: deploymentServiceNames }
        : undefined,
    [deploymentServiceNames],
  );
  const {
    data: stateServicesData,
    isPending: isStateServicesPending,
    isPlaceholderData,
  } = useListStateServices({
    placeholderData: deploymentServicesPlaceholder,
  });
  const { data: serviceData, isPending: isServicesPending } = useListServices(
    deploymentServiceNames,
  );

  return useMemo(() => {
    const stateServiceNames = new Set(stateServicesData?.services ?? []);
    const byName = new Map<string, StateRouteService>();

    for (const service of stateServiceNames) {
      byName.set(service, {
        name: service,
        hasState: true,
      });
    }

    for (const service of serviceData.values()) {
      const serviceType = getStateRouteServiceType(service.ty);
      if (!serviceType) continue;
      const item = byName.get(service.name);
      byName.set(service.name, {
        name: service.name,
        serviceType,
        hasState: item?.hasState ?? false,
      });
    }

    const sortByName = (a: StateRouteService, b: StateRouteService) =>
      a.name.localeCompare(b.name);
    const virtualObjects = Array.from(byName.values())
      .filter((service) => service.serviceType === 'virtual_object')
      .sort(sortByName);
    const workflows = Array.from(byName.values())
      .filter((service) => service.serviceType === 'workflow')
      .sort(sortByName);
    const stateOnlyServices = Array.from(byName.values())
      .filter((service) => !service.serviceType && service.hasState)
      .sort(sortByName);
    const services = [
      ...virtualObjects,
      ...workflows,
      ...stateOnlyServices,
    ].map((service) => service.name);
    const serviceTypes = new Map(
      [...virtualObjects, ...workflows].map((service) => [
        service.name,
        service.serviceType,
      ]),
    );

    return {
      isPending:
        isStateServicesPending || isDeploymentsPending || isServicesPending,
      isUsingPlaceholderServices: isPlaceholderData,
      services,
      serviceTypes,
      virtualObjects: virtualObjects.map((service) => service.name),
      workflows: workflows.map((service) => service.name),
      stateOnlyServices: stateOnlyServices.map((service) => service.name),
    };
  }, [
    isDeploymentsPending,
    isPlaceholderData,
    isServicesPending,
    isStateServicesPending,
    serviceData,
    stateServicesData,
  ]);
}

export function useCurrentStateServiceParam() {
  const { virtualObject: serviceParam } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceParam, 'Missing virtualObject param');
  return serviceParam;
}

export function useValidateVirtualObject(serviceParamOverride?: string) {
  const { virtualObject: routeServiceParam } = useParams<{
    virtualObject: string;
  }>();
  const serviceParam = serviceParamOverride ?? routeServiceParam;
  invariant(serviceParam, 'Missing virtualObject param');
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const {
    isPending,
    isUsingPlaceholderServices,
    services,
    serviceTypes,
    virtualObjects,
    workflows,
    stateOnlyServices,
  } = useStateServiceCatalog();
  const defaultService = getDefaultStateService(services);
  const canRedirect = !isPending && !isUsingPlaceholderServices;
  const isValid = services.includes(serviceParam);

  return {
    isValidating: isPending || isUsingPlaceholderServices,
    isValid: !canRedirect || isValid,
    redirectTo:
      canRedirect && services.length > 0 && !isValid && defaultService
        ? getStateServiceHref({
            baseUrl,
            service: defaultService,
            searchParams,
          })
        : undefined,
    services,
    serviceType: serviceTypes.get(serviceParam),
    virtualObjects,
    workflows,
    stateOnlyServices,
  };
}

export function ServiceSelector() {
  const serviceParam = useCurrentStateServiceParam();
  const { virtualObjects, workflows, stateOnlyServices } =
    useValidateVirtualObject(serviceParam);
  const isStateOnlyService = stateOnlyServices.includes(serviceParam);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex min-w-0 shrink-0 items-center gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30"
        >
          <span className="shrink-0 whitespace-nowrap">
            {virtualObjects.includes(serviceParam)
              ? 'Virtual Object'
              : workflows.includes(serviceParam)
                ? 'Workflow'
                : 'Service'}
          </span>
          <span className="font-mono">is</span>
          <span className="truncate font-semibold">{serviceParam}</span>
          {isStateOnlyService && <StateOnlyServiceWarningIcon />}
          <Icon
            name={IconName.ChevronsUpDown}
            className="ml-2 h-3.5 w-3.5 shrink-0"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="top">
        {virtualObjects.length > 0 && (
          <DropdownSection title="Virtual Objects">
            <DropdownMenu
              selectable
              selectedItems={[serviceParam]}
              onSelect={(value) =>
                localStorage.setItem('state_last_service', value)
              }
            >
              {virtualObjects.map((service) => (
                <DropDownVirtualObject service={service} key={service} />
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
        {workflows.length > 0 && (
          <DropdownSection title="Workflows">
            <DropdownMenu
              selectable
              selectedItems={[serviceParam]}
              onSelect={(value) =>
                localStorage.setItem('state_last_service', value)
              }
            >
              {workflows.map((service) => (
                <DropDownVirtualObject service={service} key={service} />
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
        {stateOnlyServices.length > 0 && (
          <DropdownSection title="Services with state">
            <DropdownMenu
              selectable
              selectedItems={[serviceParam]}
              onSelect={(value) =>
                localStorage.setItem('state_last_service', value)
              }
            >
              {stateOnlyServices.map((service) => (
                <DropDownVirtualObject
                  service={service}
                  key={service}
                  isStateOnly
                />
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
      </DropdownPopover>
    </Dropdown>
  );
}

function DropDownVirtualObject({
  service,
  isStateOnly,
}: {
  service: string;
  isStateOnly?: boolean;
}) {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const href = useMemo(
    () => getStateServiceHref({ baseUrl, service, searchParams }),
    [baseUrl, service, searchParams],
  );

  return (
    <DropdownItem value={service} href={href}>
      {isStateOnly ? (
        <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{service}</span>
            <StateOnlyServiceWarningIcon tooltip={false} />
          </span>
          <span className="group-focused:text-blue-100 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {stateOnlyServiceWarning}
          </span>
        </span>
      ) : (
        <span className="truncate">{service}</span>
      )}
    </DropdownItem>
  );
}
