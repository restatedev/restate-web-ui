import {
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api-spec';
import { cx, tv } from '@restate/util/styles';
import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { panelHref } from '@restate/util/panel';
import {
  Dropdown,
  DropdownPopover,
  DropdownSection,
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { formatDurations, formatPlurals } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import {
  DateTooltip,
  HoverTooltip,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { toDeploymentInvocationsHref } from '@restate/util/invocation-links';
import { useRestateContext } from '@restate/features/restate-context';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import { MiniService } from '@restate/features/service';
import type { OverviewDeployment } from './sortDeployments';
import { sortDeploymentServices } from './sortDeployments';
import {
  cardContainerStyles,
  cardInnerStyles,
  type IssueSeverity,
} from './cardShell';

function withoutCreatedAtFilter(params?: URLSearchParams) {
  if (!params) return undefined;
  const next = new URLSearchParams(params);
  next.delete('filter_created_at');
  return next;
}

const layoutStyles = tv({
  base: cx(
    'grid grid-cols-[auto_minmax(0,1fr)_7rem] items-center gap-x-3 gap-y-1',
    "[grid-template-areas:'icon_primary_services'_'._registered_services']",
  ),
});

const iconCellStyles = tv({
  base: '[grid-area:icon]',
});

const primaryCellStyles = tv({
  base: 'min-w-0 [grid-area:primary]',
});

const registeredCellStyles = tv({
  base: 'min-w-0 [grid-area:registered]',
});

const cellStyles = tv({
  base: 'flex items-center [grid-area:services]',
});

const deploymentStatusStyles = tv({
  base: 'relative inline-flex max-w-full gap-1.5 py-0.5!',
  variants: {
    status: {
      active: '',
      drained: 'bg-zinc-100 text-zinc-600',
    },
  },
});

const deploymentStatusDotStyles = tv({
  base: 'absolute rounded-full',
  variants: {
    status: {
      active: '',
      drained: '',
    },
    layer: {
      solid: 'h-2 w-2',
      pulse: 'h-2 w-2 animate-ping opacity-40',
    },
  },
  compoundVariants: [
    { status: 'active', layer: 'solid', className: 'bg-emerald-500' },
    { status: 'active', layer: 'pulse', className: 'bg-emerald-500' },
    { status: 'drained', layer: 'solid', className: 'bg-zinc-400' },
    { status: 'drained', layer: 'pulse', className: 'hidden' },
  ],
});

export function DeploymentCard({
  deployment,
  isDeploymentStatusLoading,
  isDeploymentsFetching,
  baseUrl,
  linkParams,
  isFocusVisible,
  isHovered,
  isPressed,
  issueSeverity,
}: {
  deployment: OverviewDeployment;
  isDeploymentStatusLoading: boolean;
  isDeploymentsFetching: boolean;
  baseUrl: string;
  linkParams?: URLSearchParams;
  isFocusVisible?: boolean;
  isHovered?: boolean;
  isPressed?: boolean;
  issueSeverity?: IssueSeverity;
}) {
  const { tunnel } = useRestateContext();
  const isTunnel = Boolean(
    tunnel?.isEnabled &&
    isHttpDeployment(deployment) &&
    tunnel.fromHttp(getEndpoint(deployment) ?? ''),
  );
  const endpoint = getEndpoint(deployment);
  const tunnelEndpoint =
    isTunnel && endpoint ? tunnel?.fromHttp(endpoint) : undefined;
  const displayEndpoint = isTunnel ? tunnelEndpoint?.remoteUrl : endpoint;
  const primaryIcon = isTunnel
    ? IconName.Tunnel
    : isHttpDeployment(deployment)
      ? IconName.Http
      : IconName.Lambda;

  return (
    <div className="px-2">
      <div
        className={cardContainerStyles({ isFocusVisible })}
        {...waveAnimationProps('overview-card')}
      >
        <div className={cardInnerStyles({ issueSeverity, isHovered, isPressed })}>
          <div className={layoutStyles()}>
            <div className={iconCellStyles()}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={primaryIcon}
                  className="h-full w-full fill-blue-50 p-1 text-blue-400 drop-shadow-md"
                />
              </div>
            </div>
            <div className={primaryCellStyles()}>
              {isDeploymentsFetching ? (
                <div className="h-6 w-64 max-w-full animate-pulse rounded-lg bg-gray-200/50" />
              ) : (
                <div className="group/endpoint flex min-w-0 items-center gap-1">
                  <div className="relative flex min-w-0 items-center gap-1">
                    {isTunnel && (
                      <HoverTooltip
                        content={
                          <p className="flex items-center">
                            Tunnel name:{' '}
                            <code className="ml-1 inline-block">
                              {tunnelEndpoint?.name}
                            </code>
                          </p>
                        }
                      >
                        <Badge
                          size="xs"
                          className="relative max-w-fit shrink-0 cursor-default rounded-sm py-0.5 font-mono text-[0.9em] leading-3 text-current"
                        >
                          <Icon
                            name={IconName.AtSign}
                            className="mr-0.5 h-3 w-3"
                          />
                          <div className="max-w-[20ch] truncate">
                            {tunnelEndpoint?.name}
                          </div>
                        </Badge>
                      </HoverTooltip>
                    )}
                    <TruncateWithTooltip copyText={displayEndpoint} hideCopy>
                      <span className="truncate text-base leading-7 font-medium text-zinc-700">
                        {displayEndpoint}
                      </span>
                    </TruncateWithTooltip>
                    {displayEndpoint && (
                      <Copy
                        copyText={displayEndpoint}
                        className="invisible m-0 flex h-5 w-5 shrink-0 rounded-sm p-1 text-gray-400 group-hover/endpoint:visible hover:bg-gray-50 hover:text-gray-500 pressed:bg-gray-100 [&_svg]:h-3 [&_svg]:w-3"
                      />
                    )}
                  </div>
                  {isDeploymentStatusLoading ? (
                    <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-gray-200" />
                  ) : (
                    <DeploymentStatusBadge status={deployment.status} />
                  )}
                </div>
              )}
            </div>
            <div className={registeredCellStyles()}>
              <div className="flex min-w-0 items-center gap-2">
                <RegistrationSentence
                  deploymentId={deployment.id}
                  createdAt={deployment.created_at}
                />
                {deployment.status === 'active' ? (
                  <>
                    <span className="shrink-0 text-zinc-400">·</span>
                    <Link
                      href={toDeploymentInvocationsHref(
                        baseUrl,
                        deployment.id,
                        {
                          existingParams: withoutCreatedAtFilter(linkParams),
                          inFlightOnly: true,
                        },
                      )}
                      variant="secondary"
                      className="relative flex shrink-0 items-center gap-0.5 truncate rounded-md border-none bg-transparent px-1.5 py-0.5 text-xs text-zinc-500/80 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
                    >
                      <div className="min-w-0 truncate">In-flight</div>
                      <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
            <div className={cellStyles()}>
              <ServicesDropdown deployment={deployment} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationSentence({
  deploymentId,
  createdAt,
}: {
  deploymentId: string;
  createdAt: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(createdAt);
  const duration = formatDurations(parts);
  const createdAtDate = new Date(createdAt);

  return (
    <div className="flex min-w-0 items-center gap-1 text-xs text-zinc-500/80">
      <span className="shrink-0">Registered</span>
      <div className="group/dp relative flex min-w-0 items-center">
        <div className="min-w-0 truncate font-medium text-zinc-500">
          <TruncateWithTooltip copyText={deploymentId} hideCopy>
            {deploymentId}
          </TruncateWithTooltip>
        </div>
        <Copy
          copyText={deploymentId}
          className="absolute top-1/2 right-0 m-0 hidden h-5 w-5 shrink-0 -translate-y-1/2 rounded-sm bg-white p-1 text-gray-400 group-hover/dp:flex hover:bg-gray-50 hover:text-gray-500 pressed:bg-gray-100 [&_svg]:h-3 [&_svg]:w-3"
        />
      </div>
      {!isPast && <span className="shrink-0">in</span>}
      <DateTooltip date={createdAtDate} title="Registered at">
        <span className="shrink-0 whitespace-nowrap">{duration}</span>
      </DateTooltip>
      {isPast && <span className="shrink-0">ago</span>}
    </div>
  );
}

function DeploymentStatusBadge({
  status,
}: {
  status: OverviewDeployment['status'];
}) {
  return (
    <Badge
      variant={status === 'active' ? 'success' : 'default'}
      className={deploymentStatusStyles({ status })}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span
          className={deploymentStatusDotStyles({ status, layer: 'pulse' })}
        />
        <span
          className={deploymentStatusDotStyles({ status, layer: 'solid' })}
        />
      </span>
      {status === 'active' ? 'Active' : 'Drained'}
    </Badge>
  );
}

function ServicesDropdown({ deployment }: { deployment: OverviewDeployment }) {
  const services = sortDeploymentServices(deployment.services);
  if (services.length === 0) {
    return <span className="text-0.5xs text-zinc-400">No services</span>;
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="relative inline-flex items-center gap-1 rounded-lg py-1 pr-1 pl-2 text-xs font-medium tabular-nums"
        >
          <Icon name={IconName.Box} className="h-3.5 w-3.5 text-zinc-500/80" />
          {services.length}{' '}
          <span className="opacity-80">
            {formatPlurals(services.length, {
              one: 'service',
              other: 'services',
            })}
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-gray-400"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Services">
          <DropdownMenu aria-label={`Services in deployment ${deployment.id}`}>
            {services.map((service) => (
              <DropdownItem
                key={`${service.name}-${service.revision}`}
                href={panelHref({ service: service.name })}
                value={service.name}
              >
                <MiniService
                  service={service}
                  showLink={false}
                  className="flex-auto [&_*:not(svg)]:text-inherit [&_.badge]:bg-black/3"
                />
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
