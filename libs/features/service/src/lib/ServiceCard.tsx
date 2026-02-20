import {
  Deployment as DeploymentType,
  getEndpoint,
  Handler as HandlerType,
  ServiceType,
} from '@restate/data-access/admin-api-spec';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { HANDLER_QUERY_PARAM, SERVICE_QUERY_PARAM } from './constants';
import { PropsWithChildren, useRef } from 'react';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { Handler } from './Handler';
import {
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { Deployment } from '@restate/features/deployment';

const styles = tv({
  base: 'w-full transform rounded-2xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] transition has-[[data-deprecated=true]]:border-orange-200 has-[[data-deprecated=true]]:bg-orange-200/30',
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
  base: "ml-auto rounded-full outline-offset-0 before:absolute before:inset-0 before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5",
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
  base: 'w-full transform overflow-hidden rounded-2xl border shadow-zinc-800/3 transition',
  variants: {
    isSelected: {
      true: 'scale-105 bg-white shadow-md',
      false:
        'scale-100 border-white/50 bg-linear-to-b from-gray-50 to-gray-50/80 shadow-xs',
    },
  },
  defaultVariants: { isSelected: false },
});

const MAX_NUMBER_OF_DEPLOYMENTS = 2;
const MAX_NUMBER_OF_HANDLERS = 3;

function filterHandler(
  serviceType: ServiceType,
  handler: HandlerType,
  filterText?: string,
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
      (filterText.startsWith('dp_') && deployment?.id.includes(filterText)),
  );
}

export function ServiceCard({
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
      serviceDeployments?.[revision]?.map((id) => ({ id, revision })),
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
    filterHandler(serviceDetails?.ty, handler, filterText),
  );
  const isMatchingAnyDeployment = Object.values(service?.deployments ?? {})
    .flat()
    .some((deploymentId) =>
      filterDeployment(deployments?.get(deploymentId), filterText),
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
        filterHandler(serviceDetails?.ty, handler, filterText),
    ) ?? [];
  const filteredDeployments =
    deploymentRevisionPairs.filter(
      ({ id: deploymentId }) =>
        isMatchingServiceName ||
        isMatchingAnyHandlerName ||
        filterDeployment(deployments?.get(deploymentId), filterText),
    ) ?? [];

  return (
    <div className={styles({ className, isMatching, isSelected })}>
      <div className={serviceStyles({ isSelected })} data-selected={isSelected}>
        <div className="relative flex w-full flex-row items-center gap-2 rounded-[calc(0.75rem-0.125rem)] p-2 text-sm">
          <div className="h-8 w-8 shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-lg border bg-white text-blue-400 shadow-xs">
              <Icon
                name={IconName.Box}
                className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-auto flex-row items-center gap-1 pr-2 text-[0.9rem] font-medium text-zinc-600">
            <TruncateWithTooltip copyText={serviceName} triggerRef={linkRef}>
              {serviceName}
            </TruncateWithTooltip>
            <Link
              ref={linkRef}
              aria-label={serviceName}
              variant="secondary"
              href={`?${SERVICE_QUERY_PARAM}=${serviceName}&${HANDLER_QUERY_PARAM}`}
              className={serviceLinkStyles({ isMatching })}
            >
              <Icon
                name={IconName.ChevronRight}
                className="h-4 w-4 text-gray-400"
              />
            </Link>
          </div>
        </div>
        {isMatching &&
          serviceDetails &&
          serviceDetails?.handlers?.length > 0 && (
            <div className="mb-1 flex flex-col gap-1 rounded-md rounded-t-sm px-3 pt-1 pb-3">
              <div className="flex flex-col gap-1.5">
                {filteredHandlers
                  .slice(0, MAX_NUMBER_OF_HANDLERS)
                  .map((handler) => (
                    <Handler
                      handler={handler}
                      key={handler.name}
                      className="pr-0 pl-0"
                      service={serviceName}
                      withPlayground
                      serviceType={serviceDetails.ty}
                      showLink
                      showType={false}
                    />
                  ))}
                {filteredHandlers.length > MAX_NUMBER_OF_HANDLERS && (
                  <Link
                    href={`?${SERVICE_QUERY_PARAM}=${serviceName}&${HANDLER_QUERY_PARAM}`}
                    variant="secondary"
                    aria-label={serviceName}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-8 py-1 text-left text-0.5xs text-gray-500 no-underline shadow-none hover:bg-black/3 pressed:bg-black/5"
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
        <div className="mt-1.5 flex flex-col gap-1 rounded-md rounded-t-sm px-3 pt-1 pb-3">
          <div className="flex items-center gap-2 pl-1 text-2xs font-semibold text-gray-400 uppercase">
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
                href={`?${SERVICE_QUERY_PARAM}=${serviceName}&${HANDLER_QUERY_PARAM}`}
                variant="secondary"
                aria-label={serviceName}
                className="cursor-pointer rounded-lg border-none bg-transparent px-8 py-1 text-left text-0.5xs text-gray-500 no-underline shadow-none hover:bg-black/3 pressed:bg-black/5"
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
