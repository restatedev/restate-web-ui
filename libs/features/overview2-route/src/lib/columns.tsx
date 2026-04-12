import type { ReactNode } from 'react';
import { type Service } from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import type { GridListColumn } from '@restate/ui/grid-list';
import type { ServiceIssue } from '@restate/features/system-health';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util/intl';
import {
  toDeploymentInvocationsHref,
  toServiceInvocationsHref,
} from '@restate/util/invocation-links';
import {
  ServiceType,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/features/service';
import {
  Deployment,
  LatestRevisionDeployment,
  OlderRevisions,
} from '@restate/features/deployment';
import { ServiceStatusBar } from '@restate/features/status-chart';
import { IssueBadge } from '@restate/ui/issue-banner';
import {
  DateTooltip,
  HoverTooltip,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import type { OverviewDeployment } from './sortDeployments';

function withoutCreatedAtFilter(params?: URLSearchParams) {
  if (!params) return undefined;
  const next = new URLSearchParams(params);
  next.delete('filter_created_at');
  return next;
}

const deploymentStatusStyles = tv({
  base: 'relative inline-flex max-w-full gap-1.5',
  variants: {
    status: {
      active: '',
      drained: 'bg-zinc-100 text-zinc-600',
    },
  },
});

const overviewPrimaryRowStyles = tv({
  base: '-mx-1 flex min-w-0 items-center gap-2 self-start rounded-lg px-1 py-0.5 hover:bg-black/3',
  variants: {
    balancedHeight: {
      true: 'min-h-[2.625rem]',
      false: '',
    },
  },
  defaultVariants: {
    balancedHeight: true,
  },
});

const overviewFirstColumnSecondaryStyles = tv({
  base: '-mt-2 mb-2 ml-7.5 min-h-6 min-w-0',
});

export function useServiceColumns({
  byServiceAndStatus,
  baseUrl,
  serviceIssuesMap,
  isSummaryError,
  isSummaryLoading,
  linkParams,
}: {
  byServiceAndStatus: { service: string; status: string; count: number }[];
  baseUrl: string;
  serviceIssuesMap: Map<string, ServiceIssue[]>;
  isSummaryError: boolean;
  isSummaryLoading: boolean;
  linkParams?: URLSearchParams;
}): GridListColumn<Service>[] {
  return [
    {
      id: 'name',
      title: 'Service',
      allowsSorting: true,
      render: (s: Service) => (
        <OverviewFirstColumn
          primary={
            <div className={overviewPrimaryRowStyles()}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-blue-50 p-1 text-blue-400 drop-shadow-md"
                />
              </div>
              <span className="min-w-0 truncate text-base font-medium text-zinc-700">
                {s.name}
              </span>

              <HoverTooltip content="Playground">
                <Link
                  href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${s.name}`}
                  variant="secondary-button"
                  className="mt-1.5 mr-0.5 ml-0 shrink-0 px-1 py-1"
                >
                  <Icon
                    name={IconName.Play}
                    className="ml-px h-3 w-3 text-blue-700"
                  />
                </Link>
              </HoverTooltip>
            </div>
          }
          secondary={
            <div className="invisible shrink-0 xl:visible">
              <ServiceType
                type={s.ty}
                className="border-transparent bg-transparent font-normal text-gray-500"
              />
            </div>
          }
        />
      ),
    },
    {
      id: 'revision',
      title: 'Deployment',
      allowsSorting: true,
      render: (s: Service) => (
        <OverviewColumnMeta
          className="max-w-fit"
          primary={<LatestRevisionDeployment serviceName={s.name} />}
          secondary={
            <div className="pl-8">
              <OlderRevisions serviceName={s.name} />
            </div>
          }
        />
      ),
    },
    {
      id: 'invocations',
      title: 'Invocations',
      allowsSorting: true,
      render: (s: Service) => {
        const serviceStatuses = byServiceAndStatus.filter(
          (st) => st.service === s.name && st.count > 0,
        );
        const serviceTotal = serviceStatuses.reduce(
          (sum, st) => sum + st.count,
          0,
        );
        return (
          <OverviewColumnMeta
            className="pr-3"
            primary={
              <div className="w-full">
                <ServiceStatusBar
                  serviceName={s.name}
                  byServiceAndStatus={byServiceAndStatus}
                  serviceIssues={serviceIssuesMap.get(s.name)}
                  isSummaryError={isSummaryError}
                  isSummaryLoading={isSummaryLoading}
                  linkParams={linkParams}
                />
              </div>
            }
            secondary={
              serviceTotal > 0 ? (
                <Link
                  href={toServiceInvocationsHref(baseUrl, s.name, {
                    existingParams: linkParams,
                  })}
                  variant="secondary"
                  className="relative z-10 inline-flex w-auto min-w-0 items-center gap-0.5 truncate rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
                >
                  {formatNumber(serviceTotal, true)}{' '}
                  {formatPlurals(serviceTotal, {
                    one: 'invocation',
                    other: 'invocations',
                  })}
                  <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                </Link>
              ) : undefined
            }
          />
        );
      },
    },
    {
      id: 'health',
      title: 'Issues',
      allowsSorting: true,
      render: (s: Service) => {
        const issues = serviceIssuesMap.get(s.name) ?? [];
        if (issues.length === 0) return null;
        return (
          <IssueBadge issues={issues} serviceName={s.name} baseUrl={baseUrl} />
        );
      },
    },
  ];
}

export function useDeploymentColumns({
  isDeploymentStatusLoading,
  baseUrl,
  linkParams,
}: {
  isDeploymentStatusLoading: boolean;
  baseUrl: string;
  linkParams?: URLSearchParams;
}): GridListColumn<OverviewDeployment>[] {
  return [
    {
      id: 'deployment',
      title: 'Deployment',
      allowsSorting: true,
      render: (deployment) => (
        <div className="max-w-fit min-w-0 truncate">
          <OverviewFirstColumn
            primary={
              <Deployment
                deploymentId={deployment.id}
                highlightSelection={false}
                showLink={false}
                variant="primary"
              />
            }
            secondary={<OverviewDeploymentId deploymentId={deployment.id} />}
          />
          <div className="-mt-1 mb-1 ml-7.5 flex items-center gap-2 text-0.5xs text-gray-500 md:hidden">
            {isDeploymentStatusLoading ? (
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
            ) : (
              <DeploymentStatusBadge status={deployment.status} />
            )}
            <DeploymentCreatedAt value={deployment.created_at} />
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      title: 'Status',
      allowsSorting: true,
      render: (deployment) => (
        <OverviewColumnMeta
          primary={
            isDeploymentStatusLoading ? (
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
            ) : (
              <DeploymentStatusBadge status={deployment.status} />
            )
          }
          secondary={
            <>
              {deployment.status === 'active' ? (
                <Link
                  href={toDeploymentInvocationsHref(baseUrl, deployment.id, {
                    existingParams: withoutCreatedAtFilter(linkParams),
                    inFlightOnly: true,
                  })}
                  variant="secondary"
                  className="relative z-10 inline-flex w-auto min-w-0 items-center gap-0.5 truncate rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
                >
                  In-flight invocations
                  <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                </Link>
              ) : (
                <div>
                  <br />
                </div>
              )}
            </>
          }
        />
      ),
    },
    {
      id: 'created_at',
      title: 'Created at',
      allowsSorting: true,
      render: (deployment) => (
        <OverviewColumnMeta
          primary={<DeploymentCreatedAt value={deployment.created_at} />}
        />
      ),
    },
  ];
}

function OverviewFirstColumn({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <div className="flex flex-col px-1">
      {primary}
      <div className={overviewFirstColumnSecondaryStyles()}>{secondary}</div>
    </div>
  );
}

function OverviewColumnMeta({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={overviewColumnMetaStyles({ className })}>
      <div className="flex min-h-7 items-center">{primary}</div>
      <div className="min-h-6 min-w-0">
        {secondary ?? (
          <div className="px-1.5 py-0.5 text-0.5xs leading-5 text-transparent">
            <br />
          </div>
        )}
      </div>
    </div>
  );
}

const overviewColumnMetaStyles = tv({
  base: 'hidden min-w-0 md:flex md:flex-col',
});

function OverviewDeploymentId({ deploymentId }: { deploymentId: string }) {
  return (
    <Badge
      variant="info"
      size="sm"
      className="max-w-full border-transparent bg-transparent font-normal text-gray-500"
    >
      <div className="min-w-0 truncate">
        <TruncateWithTooltip copyText={deploymentId} hideCopy>
          {deploymentId}
        </TruncateWithTooltip>
      </div>
      <Copy
        copyText={deploymentId}
        className="ml-0.5 shrink-0 rounded-xs p-1 text-gray-400 hover:bg-black/5 hover:text-gray-500 pressed:bg-black/8 [&_svg]:h-2.5 [&_svg]:w-2.5"
      />
    </Badge>
  );
}

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
    {
      status: 'active',
      layer: 'solid',
      className: 'bg-emerald-500',
    },
    {
      status: 'active',
      layer: 'pulse',
      className: 'bg-emerald-500',
    },
    {
      status: 'drained',
      layer: 'solid',
      className: 'bg-zinc-400',
    },
    {
      status: 'drained',
      layer: 'pulse',
      className: 'hidden',
    },
  ],
});

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

function DeploymentCreatedAt({ value }: { value: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(value);
  const duration = formatDurations(parts);
  const createdAt = new Date(value);

  return (
    <Badge className="w-full border-none bg-transparent pl-1.5">
      <span className="w-full truncate">
        <span className="font-normal text-zinc-500">{!isPast && 'in '}</span>
        <DateTooltip date={createdAt} title="Created at">
          {duration}
        </DateTooltip>
        <span className="font-normal text-zinc-500">{isPast && ' ago'}</span>
      </span>
    </Badge>
  );
}
