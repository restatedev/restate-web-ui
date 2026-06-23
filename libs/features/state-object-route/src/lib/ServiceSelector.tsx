import {
  useListDeployments,
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
import { useRestateContext } from '@restate/features/restate-context';
import { useMemo } from 'react';
import { useHref, useParams, useSearchParams } from 'react-router';
import invariant from 'tiny-invariant';

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

function getDefaultVirtualObjectOrWorkflow(services: string[]) {
  if (typeof window !== 'undefined') {
    const previousSelectedState = localStorage.getItem('state_last_service');
    return previousSelectedState && services.includes(previousSelectedState)
      ? previousSelectedState
      : services.at(0);
  }
  return services.at(0);
}

export function useValidateVirtualObject() {
  const { virtualObject: serviceParam } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceParam, 'Missing virtualObject param');
  const [searchParams] = useSearchParams();
  const { data: deployments, isPending } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const servicesSize = services.length;
  const { data } = useListServices(services);
  const virtualObjects = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'VirtualObject')
    .map((service) => service.name)
    .sort();
  const workflows = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'Workflow')
    .map((service) => service.name)
    .sort();
  const virtualObjectsAndWorkflows = [...virtualObjects, ...workflows];
  const newService = getDefaultVirtualObjectOrWorkflow(
    virtualObjectsAndWorkflows,
  );

  const base = useHref('/');
  const defaultService = useHref(newService ? `../${newService}` : '..', {
    relative: 'path',
  }).replace(base, '');

  const isInValid =
    data.size === servicesSize &&
    servicesSize > 0 &&
    !virtualObjectsAndWorkflows.includes(serviceParam);
  const search = searchParams.toString();

  return {
    isValidating: isPending,
    isValid: virtualObjectsAndWorkflows.includes(serviceParam),
    redirectTo: isInValid
      ? `/${defaultService}${search ? `?${search}` : ''}`
      : undefined,
    virtualObjectsAndWorkflows,
    virtualObjects,
    workflows,
  };
}

export function ServiceSelector() {
  const { virtualObject: serviceParam } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceParam, 'Missing virtualObject param');
  const { virtualObjects, workflows } = useValidateVirtualObject();

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
      </DropdownPopover>
    </Dropdown>
  );
}

function DropDownVirtualObject({ service }: { service: string }) {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const href = useMemo(
    () => getStateServiceHref({ baseUrl, service, searchParams }),
    [baseUrl, service, searchParams],
  );

  return (
    <DropdownItem value={service} href={href}>
      {service}
    </DropdownItem>
  );
}
