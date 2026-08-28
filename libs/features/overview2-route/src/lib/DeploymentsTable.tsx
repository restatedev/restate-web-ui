import {
  getEndpoint,
  type Deployment as DeploymentMetadata,
} from '@restate/data-access/admin-api-spec';
import {
  DELETE_DEPLOYMENT_QUERY_PARAM,
  Deployment,
} from '@restate/features/deployment';
import {
  DELETE_SELECTED_DEPLOYMENTS_QUERY,
  DeleteSelectedDeploymentsDialog,
} from '@restate/features/prune-deployments';
import { UPDATE_DEPLOYMENT_QUERY } from '@restate/features/register-deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { MiniService } from '@restate/features/service';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { SplitButton } from '@restate/ui/split-button';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { DateTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util/intl';
import {
  DEPLOYMENT_QUERY_PARAM,
  panelHref,
  usePanel,
} from '@restate/util/panel';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import {
  type OverviewDeployment,
  sortDeployments,
  sortDeploymentServices,
} from './sortDeployments';

type DeploymentColumn =
  | 'deployment'
  | 'status'
  | 'services'
  | 'created_at'
  | 'actions';

const COLUMNS: PanelTableColumn<DeploymentColumn>[] = [
  {
    id: 'deployment',
    name: 'Deployment',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '3.5fr',
    minWidth: 320,
  },
  {
    id: 'status',
    name: 'Status',
    allowsSorting: true,
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 140,
  },
  {
    id: 'services',
    name: 'Services',
    defaultWidth: 150,
    minWidth: 130,
    maxWidth: 170,
  },
  {
    id: 'created_at',
    name: 'Registered',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: 150,
    minWidth: 130,
    maxWidth: 170,
  },
  {
    id: 'actions',
    name: 'Actions',
    width: 40,
    hideLabel: true,
  },
];

const deploymentTableStyles = tv({
  slots: {
    row: 'cursor-pointer [content-visibility:auto]',
    identity: 'flex min-w-0 items-center gap-1.5 py-0.5',
    deployment:
      'min-w-0 flex-[0_1_auto] text-[0.8125rem] font-medium text-zinc-600 [&_div:has(>svg)]:h-6 [&_div:has(>svg)]:w-6',
    deploymentId:
      'block max-w-full min-w-0 truncate rounded-md border border-zinc-200/80 bg-zinc-50/80 px-1.5 py-0.5 font-mono text-2xs font-normal text-zinc-400',
    status: 'relative inline-flex max-w-full shrink-0 gap-1.5 py-0.5!',
  },
  variants: {
    status: {
      active: '',
      drained: 'bg-zinc-100 text-zinc-600',
    },
  },
});

const deploymentStatusDotStyles = tv({
  base: 'absolute h-2 w-2 rounded-full',
  variants: {
    status: {
      active: 'bg-emerald-500',
      drained: 'bg-zinc-400',
    },
    layer: {
      solid: '',
      pulse: 'animate-ping opacity-40',
    },
  },
  compoundVariants: [
    { status: 'drained', layer: 'pulse', className: 'hidden' },
  ],
});

const deploymentRowActionPrimaryStyles = tv({
  base: 'invisible absolute right-full z-2 flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] whitespace-nowrap drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible',
  variants: {
    destructive: {
      true: 'text-red-500',
      false: 'text-blue-700',
    },
  },
});

function includesFilter(value: string | null | undefined, filter: string) {
  return value?.toLowerCase().includes(filter) ?? false;
}

export function getDeploymentTableRows({
  deploymentsMap,
  drainedDeploymentIds,
  filter,
  sortDescriptor,
}: {
  deploymentsMap?: Map<string, DeploymentMetadata>;
  drainedDeploymentIds: Set<string>;
  filter: string;
  sortDescriptor: Parameters<typeof sortDeployments>[1];
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const deployments: OverviewDeployment[] = Array.from(
    deploymentsMap?.values() ?? [],
  ).map((deployment) => ({
    ...deployment,
    status: drainedDeploymentIds.has(deployment.id) ? 'drained' : 'active',
  }));
  const filtered = normalizedFilter
    ? deployments.filter(
        (deployment) =>
          includesFilter(deployment.id, normalizedFilter) ||
          includesFilter(getEndpoint(deployment), normalizedFilter) ||
          deployment.services.some((service) =>
            includesFilter(service.name, normalizedFilter),
          ),
      )
    : deployments;

  return sortDeployments(filtered, sortDescriptor);
}

function DeploymentStatus({
  status,
}: {
  status: OverviewDeployment['status'];
}) {
  const styles = deploymentTableStyles();
  return (
    <Badge
      variant={status === 'active' ? 'success' : 'default'}
      className={styles.status({ status })}
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

function DeploymentServices({
  deployment,
}: {
  deployment: OverviewDeployment;
}) {
  const services = sortDeploymentServices(deployment.services);
  if (services.length === 0) {
    return (
      <span className="text-xs font-normal text-zinc-400">No services</span>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="relative inline-flex items-center gap-1 rounded-lg py-1 pr-1 pl-2 text-xs font-medium tabular-nums"
        >
          <Icon name={IconName.Box} className="h-3.5 w-3.5 text-zinc-500/80" />
          {formatNumber(services.length, true)}{' '}
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

function RegisteredAt({ value }: { value: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...durationParts } = durationSinceLastSnapshot(value);
  const duration = formatDurations(durationParts);
  return (
    <DateTooltip date={new Date(value)} title="Registered at">
      <time
        dateTime={value}
        className="text-xs font-normal text-zinc-500 tabular-nums"
      >
        {isPast ? `${duration} ago` : `in ${duration}`}
      </time>
    </DateTooltip>
  );
}

function DeploymentRowActions({
  deploymentId,
  isUpdateSupported,
}: {
  deploymentId: string;
  isUpdateSupported?: boolean;
}) {
  const primaryAction = isUpdateSupported
    ? {
        href: `?${UPDATE_DEPLOYMENT_QUERY}=${deploymentId}`,
        label: 'Update',
        destructive: false,
      }
    : {
        href: `?${DELETE_DEPLOYMENT_QUERY_PARAM}=${deploymentId}`,
        label: 'Delete',
        destructive: true,
      };

  return (
    <SplitButton
      mini
      menus={
        <>
          {isUpdateSupported && (
            <DropdownItem href={`?${UPDATE_DEPLOYMENT_QUERY}=${deploymentId}`}>
              Update
            </DropdownItem>
          )}
          <DropdownItem
            href={`?${DELETE_DEPLOYMENT_QUERY_PARAM}=${deploymentId}`}
            destructive
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      <Link
        href={primaryAction.href}
        variant="secondary-button"
        className={deploymentRowActionPrimaryStyles({
          destructive: primaryAction.destructive,
        })}
      >
        {primaryAction.label}
      </Link>
    </SplitButton>
  );
}

export function DeploymentsTable() {
  const {
    filter,
    deploymentsMap,
    drainedDeploymentIds,
    isDeploymentStatusLoading,
    isDeploymentsFetching,
    resolvedDeploymentSortDescriptor,
    setDeploymentSortDescriptor,
  } = useOverviewContext();
  const deployments = useMemo(
    () =>
      getDeploymentTableRows({
        deploymentsMap,
        drainedDeploymentIds,
        filter,
        sortDescriptor: resolvedDeploymentSortDescriptor,
      }),
    [
      deploymentsMap,
      drainedDeploymentIds,
      filter,
      resolvedDeploymentSortDescriptor,
    ],
  );
  const [selectedDeploymentIds, setSelectedDeploymentIds] = useState(
    new Set<string>(),
  );
  const [, setSearchParams] = useSearchParams();
  const { isVersionGte } = useRestateContext();
  const isDeploymentUpdateSupported = isVersionGte?.('1.6.0');

  useEffect(() => {
    if (!deploymentsMap) return;
    setSelectedDeploymentIds((current) => {
      const next = new Set(
        Array.from(current).filter((deploymentId) =>
          deploymentsMap.has(deploymentId),
        ),
      );
      return next.size === current.size ? current : next;
    });
  }, [deploymentsMap]);

  const openDeleteSelectedDeployments = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(DELETE_SELECTED_DEPLOYMENTS_QUERY, 'true');
        return next;
      },
      { preventScrollReset: true },
    );
  };
  const { open } = usePanel();
  const styles = deploymentTableStyles();

  return (
    <>
      <PanelTable
        aria-label="Deployments"
        columns={COLUMNS}
        items={deployments}
        selectionMode="multiple"
        selectedKeys={selectedDeploymentIds}
        onSelectionChange={(keys) =>
          setSelectedDeploymentIds(keys as Set<string>)
        }
        isLoading={isDeploymentsFetching}
        numOfRows={Math.max(deployments.length, 6)}
        sortDescriptor={resolvedDeploymentSortDescriptor}
        onSortChange={(descriptor) =>
          setDeploymentSortDescriptor(descriptor ?? null)
        }
        onRowAction={(deploymentId) =>
          open(DEPLOYMENT_QUERY_PARAM, String(deploymentId))
        }
        rowClassName={styles.row()}
        bodyDependencies={[isDeploymentStatusLoading]}
        toolbar={
          selectedDeploymentIds.size > 0 ? (
            <>
              <span className="text-sm font-medium text-red-800 tabular-nums">
                {formatNumber(selectedDeploymentIds.size)}{' '}
                {formatPlurals(selectedDeploymentIds.size, {
                  one: 'deployment',
                  other: 'deployments',
                })}{' '}
                selected
              </span>
              <Button
                variant="secondary"
                className="ml-auto flex items-center gap-1.5 rounded-lg border-red-200 bg-white/90 px-2.5 py-1 text-xs text-red-700 shadow-none hover:border-red-300 hover:bg-red-100 pressed:bg-red-200"
                onClick={openDeleteSelectedDeployments}
              >
                <Icon name={IconName.Trash} className="h-3.5 w-3.5" />
                Delete…
              </Button>
            </>
          ) : undefined
        }
        toolbarWrapperClassName="h-11 -mb-10"
        toolbarClassName="mt-0.5 h-9 rounded-xl border border-red-200/90 bg-red-50/90 pr-1 pl-3 shadow-none supports-[-moz-appearance:none]:bg-red-50"
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Search}
            title="No matching deployments"
            description="Try adjusting your search."
          />
        }
        renderCell={(deployment, column) => {
          if (column.id === 'deployment') {
            return (
              <Cell className="min-w-0 overflow-hidden">
                <div className={styles.identity()}>
                  <Deployment
                    deploymentId={deployment.id}
                    variant="secondary"
                    highlightSelection={false}
                    showLink={false}
                    className={styles.deployment()}
                  />
                  <TruncateWithTooltip
                    copyText={deployment.id}
                    tooltipContent={deployment.id}
                    alwaysShow
                    containerClassName="max-w-64 min-w-0 flex-[0_1_auto]"
                  >
                    <code className={styles.deploymentId()}>
                      ID {deployment.id}
                    </code>
                  </TruncateWithTooltip>
                </div>
              </Cell>
            );
          }
          if (column.id === 'status') {
            return (
              <Cell>
                {isDeploymentStatusLoading ? (
                  <span className="block h-6 w-20 shrink-0 animate-pulse rounded-full bg-gray-200/70" />
                ) : (
                  <DeploymentStatus status={deployment.status} />
                )}
              </Cell>
            );
          }
          if (column.id === 'services') {
            return (
              <Cell className="[&&&]:overflow-visible">
                <DeploymentServices deployment={deployment} />
              </Cell>
            );
          }
          if (column.id === 'actions') {
            return (
              <Cell className="align-top [&&&]:overflow-visible">
                <DeploymentRowActions
                  deploymentId={deployment.id}
                  isUpdateSupported={isDeploymentUpdateSupported}
                />
              </Cell>
            );
          }
          return (
            <Cell>
              <RegisteredAt value={deployment.created_at} />
            </Cell>
          );
        }}
      />
      <DeleteSelectedDeploymentsDialog
        deploymentIds={Array.from(selectedDeploymentIds)}
        onDeleted={() => setSelectedDeploymentIds(new Set())}
      />
    </>
  );
}
