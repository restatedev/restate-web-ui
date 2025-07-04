import {
  Deployment as DeploymentType,
  getEndpoint,
  Handler as HandlerType,
  ServiceType,
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { Deployment } from './Deployment';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { SERVICE_QUERY_PARAM } from './constants';
import { PropsWithChildren, useRef } from 'react';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { Handler } from './Handler';

const styles = tv({
  base: ' w-full rounded-2xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] transform transition',
  variants: {
    isMatching: {
      true: '',
      false: 'opacity-70',
    },
    isSelected: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    { isMatching: false, isSelected: true, className: 'opacity-100' },
  ],
  defaultVariants: {
    isMatching: true,
  },
});

const serviceLinkStyles = tv({
  base: "outline-offset-0 rounded-full before:absolute before:inset-0 before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5",
  variants: {
    isMatching: {
      true: 'before:rounded-t-[0.9rem]',
      false: 'before:rounded-[0.9rem]',
    },
  },
  defaultVariants: {
    isMatching: true,
  },
});

const serviceStyles = tv({
  base: 'w-full rounded-2xl border  shadow-zinc-800/[0.03] transform transition overflow-hidden',
  variants: {
    isSelected: {
      true: 'bg-white shadow-md scale-105',
      false:
        'border-white/50 bg-gradient-to-b to-gray-50/80 from-gray-50 shadow-sm scale-100',
    },
  },
  defaultVariants: { isSelected: false },
});

const MAX_NUMBER_OF_DEPLOYMENTS = 2;
const MAX_NUMBER_OF_HANDLERS = 3;

function filterHandler(
  serviceType: ServiceType,
  handler: HandlerType,
  filterText?: string
) {
  const lowerCaseFilter = filterText?.toLowerCase();
  return (
    !lowerCaseFilter ||
    handler.name.toLowerCase().includes(lowerCaseFilter) ||
    (serviceType !== 'Service' &&
      handler.ty?.toLowerCase().includes(lowerCaseFilter)) ||
    handler.input_description?.toLowerCase().includes(lowerCaseFilter) ||
    handler.output_description?.toLowerCase().includes(lowerCaseFilter)
  );
}
function filterDeployment(deployment?: DeploymentType, filterText?: string) {
  return Boolean(
    !filterText ||
      getEndpoint(deployment)
        ?.toLowerCase()
        .includes(filterText.toLowerCase()) ||
      (filterText.startsWith('dp_') && deployment?.id.includes(filterText))
  );
}

export function Service({
  className,
  serviceName,
  filterText,
  children,
}: PropsWithChildren<{
  serviceName: string;
  className?: string;
  filterText?: string;
}>) {
  const { data: { services, deployments } = {} } = useListDeployments();
  const { data: serviceDetails } = useServiceDetails(serviceName);
  const service = services?.get(serviceName);
  const serviceDeployments = service?.deployments;
  const revisions = service?.sortedRevisions ?? [];

  const activeServiceInSidebar = useActiveSidebarParam(SERVICE_QUERY_PARAM);
  const isSelected = activeServiceInSidebar === serviceName;
  const linkRef = useRef<HTMLAnchorElement>(null);

  const deploymentRevisionPairs = revisions
    .map((revision) =>
      serviceDeployments?.[revision]?.map((id) => ({ id, revision }))
    )
    .flat()
    .filter(Boolean) as {
    id: string;
    revision: number;
  }[];

  const isMatchingServiceName =
    !filterText ||
    serviceName.toLowerCase().includes(filterText.toLowerCase()) ||
    serviceDetails?.ty.toLowerCase().includes(filterText.toLowerCase());
  const isMatchingAnyHandlerName = serviceDetails?.handlers?.some((handler) =>
    filterHandler(serviceDetails?.ty, handler, filterText)
  );
  const isMatchingAnyDeployment = Object.values(service?.deployments ?? {})
    .flat()
    .some((deploymentId) =>
      filterDeployment(deployments?.get(deploymentId), filterText)
    );

  const isMatching =
    isMatchingAnyDeployment ||
    isMatchingAnyHandlerName ||
    isMatchingServiceName;

  const filteredHandlers =
    serviceDetails?.handlers?.filter(
      (handler) =>
        isMatchingServiceName ||
        isMatchingAnyDeployment ||
        filterHandler(serviceDetails?.ty, handler, filterText)
    ) ?? [];
  const filteredDeployments =
    deploymentRevisionPairs.filter(
      ({ id: deploymentId }) =>
        isMatchingServiceName ||
        isMatchingAnyHandlerName ||
        filterDeployment(deployments?.get(deploymentId), filterText)
    ) ?? [];

  return (
    <div className={styles({ className, isMatching, isSelected })}>
      <div className={serviceStyles({ isSelected })} data-selected={isSelected}>
        <div className="relative p-2 w-full rounded-[calc(0.75rem-0.125rem)] flex items-center gap-2 flex-row text-sm">
          <div className="h-8 w-8 shrink-0">
            <div className="rounded-lg bg-white border shadow-sm text-blue-400 h-full w-full flex items-center justify-center">
              <Icon
                name={IconName.Box}
                className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
              />
            </div>
          </div>
          <div className="flex flex-row gap-1 items-center font-medium [font-size:0.9rem] text-zinc-600 min-w-0">
            <TruncateWithTooltip copyText={serviceName} triggerRef={linkRef}>
              {serviceName}
            </TruncateWithTooltip>
            <Link
              ref={linkRef}
              aria-label={serviceName}
              variant="secondary"
              href={`?${SERVICE_QUERY_PARAM}=${serviceName}`}
              className={serviceLinkStyles({ isMatching })}
            >
              <Icon
                name={IconName.ChevronRight}
                className="w-4 h-4 text-gray-500"
              />
            </Link>
          </div>
        </div>
        {isMatching &&
          serviceDetails &&
          serviceDetails?.handlers?.length > 0 && (
            <div className="mb-1 px-3 pb-3 pt-1 flex flex-col rounded-md rounded-t-sm gap-1">
              <div className="flex flex-col gap-1.5">
                {filteredHandlers
                  .slice(0, MAX_NUMBER_OF_HANDLERS)
                  .map((handler) => (
                    <Handler
                      handler={handler}
                      key={handler.name}
                      className="pl-0"
                      service={serviceName}
                      withPlayground
                      serviceType={serviceDetails.ty}
                    />
                  ))}
                {filteredHandlers.length > MAX_NUMBER_OF_HANDLERS && (
                  <Link
                    href={`?${SERVICE_QUERY_PARAM}=${serviceName}`}
                    variant="secondary"
                    aria-label={serviceName}
                    className="text-gray-500 text-code bg-transparent no-underline border-none shadow-none text-left px-8 py-1 cursor-pointer rounded-lg  hover:bg-black/[0.03] pressed:bg-black/5"
                  >
                    +{filteredHandlers.length - MAX_NUMBER_OF_HANDLERS} handler
                    {filteredHandlers.length - MAX_NUMBER_OF_HANDLERS > 1
                      ? 's'
                      : ''}
                    …
                  </Link>
                )}
              </div>
            </div>
          )}
        {children}
      </div>
      {isMatching && revisions.length > 0 && (
        <div className="px-3 mt-1.5 pb-3 pt-1 flex flex-col rounded-md rounded-t-sm gap-1">
          <div className="pl-1 uppercase text-2xs font-semibold text-gray-400 flex gap-2 items-center">
            Deployments
          </div>
          <div className="flex flex-col gap-1.5">
            {filteredDeployments
              .slice(0, MAX_NUMBER_OF_DEPLOYMENTS)
              .map(({ id, revision }) => (
                <Deployment deploymentId={id} revision={revision} key={id} />
              ))}

            {filteredDeployments.length > MAX_NUMBER_OF_DEPLOYMENTS && (
              <Link
                href={`?${SERVICE_QUERY_PARAM}=${serviceName}`}
                variant="secondary"
                aria-label={serviceName}
                className="text-gray-500 text-code bg-transparent no-underline border-none shadow-none text-left px-8 py-1 cursor-pointer rounded-lg  hover:bg-black/[0.03] pressed:bg-black/5"
              >
                +{filteredDeployments.length - MAX_NUMBER_OF_DEPLOYMENTS}{' '}
                deployment
                {filteredDeployments.length - MAX_NUMBER_OF_DEPLOYMENTS > 1
                  ? 's'
                  : ''}
                …
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
