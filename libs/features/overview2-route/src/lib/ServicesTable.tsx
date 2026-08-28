import {
  getEndpoint,
  type Deployment,
  type Handler,
  type Service,
} from '@restate/data-access/admin-api-spec';
import {
  AllRevisions,
  LatestRevisionDeployment,
} from '@restate/features/deployment';
import { useRestateContext } from '@restate/features/restate-context';
import {
  Handler as ServiceHandler,
  ServiceType,
} from '@restate/features/service';
import { ServiceTarget } from '@restate/features/service-target';
import {
  buildStatusEntries,
  ServiceStatusBar,
} from '@restate/features/status-chart';
import type { ServiceIssue } from '@restate/features/system-health';
import { Button } from '@restate/ui/button';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { IssueBadge } from '@restate/ui/issue-banner';
import { Link } from '@restate/ui/link';
import {
  Cell,
  PanelTable,
  type PanelTableColumn,
  Row,
} from '@restate/ui/table';
import { HoverTooltip, RelativeDate } from '@restate/ui/tooltip';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import {
  toServiceAndHandlerInvocationsHref,
  toServiceInvocationsHref,
} from '@restate/util/invocation-links';
import { useOnboarding } from '@restate/util/feature-flag';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  panelHref,
  usePanel,
} from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import {
  Collection,
  type Key,
  type SortDescriptor,
} from 'react-aria-components';
import { useMemo, useState } from 'react';
import { useOverviewContext } from './OverviewContext';
import { sortServices } from './sortServices';

type ServiceColumn =
  | 'name'
  | 'invocations'
  | 'health'
  | 'created_at'
  | 'deployment';

export interface OverviewServiceTableRow extends Service {
  id: string;
  visibleHandlers: Handler[];
  autoExpand: boolean;
}

interface OverviewHandlerTableRow {
  id: string;
  handler: Handler;
}

const COLUMNS: PanelTableColumn<ServiceColumn>[] = [
  {
    id: 'name',
    name: 'Service / handler',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '3.75fr',
    minWidth: 360,
  },
  {
    id: 'invocations',
    name: 'Not completed invocations',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '1.5fr',
    minWidth: 190,
  },
  {
    id: 'health',
    name: 'Issues',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '0.5fr',
    minWidth: 70,
  },
  {
    id: 'created_at',
    name: 'Last deployed',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '0.75fr',
    minWidth: 100,
  },
  {
    id: 'deployment',
    name: 'Deployment',
    defaultWidth: '2.75fr',
    minWidth: 240,
  },
];

const tableStyles = tv({
  slots: {
    row: 'cursor-pointer [content-visibility:auto]',
    childRow: 'cursor-pointer bg-gray-50/35 hover:bg-gray-100/80',
    identityCell: '[&&&]:overflow-visible',
    serviceIdentity: 'flex min-w-0 items-center gap-2',
    serviceTarget:
      'min-w-0 flex-[0_1_auto] [&_[data-chip-root]]:text-[0.8125rem] [&_[data-chip-segment-inner]>svg]:h-3.5 [&_[data-chip-segment-inner]>svg]:w-3.5',
    serviceType:
      'shrink-0 justify-self-end border-zinc-200/80 bg-zinc-100/70 px-1.5 py-0 text-2xs font-normal whitespace-nowrap text-zinc-500',
    serviceMetadata:
      'ml-auto grid shrink-0 grid-cols-[7rem_5.5rem] items-center gap-2',
    chevron:
      'h-5 w-5 shrink-0 rounded-md p-0.5 text-gray-400 group-data-[expanded=true]/row:rotate-90',
    handlerCount:
      'shrink-0 text-right text-xs font-normal whitespace-nowrap text-zinc-400 tabular-nums',
    handlerIdentity: 'flex min-w-0 items-center gap-1.5 pl-7',
    handler: 'max-w-fit min-w-0 pr-0 pl-0',
    handlerInvocationCell: 'p-0!',
    handlerInvocationTooltip: 'h-full w-full',
    handlerInvocationLink:
      'h-full w-full justify-start rounded-none border-none bg-transparent px-2 py-2 text-gray-400/80 shadow-none hover:bg-black/3 hover:text-gray-500',
    handlerInvocationIcon: 'h-4 w-4',
    playground:
      'relative shrink-0 border-none bg-gray-50 px-1 py-1 align-middle shadow-none',
    invocationsCell: 'p-0!',
    invocations:
      'group/invocations grid h-full w-full min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 rounded-none py-2 pr-3 pl-2 text-inherit no-underline',
    invocationCount:
      'inline-flex items-center gap-0.5 justify-self-start rounded-md bg-black/3 px-1.5 py-0.5 text-xs font-medium text-zinc-500 tabular-nums group-hover/invocations:bg-white group-hover/invocations:text-zinc-700',
    invocationBar: 'w-full max-w-28 min-w-0 justify-self-end',
  },
});

function handlerRowId(serviceName: string, handlerName: string) {
  return `${serviceName}\x00${handlerName}`;
}

function includesFilter(value: string | null | undefined, filter: string) {
  return value?.toLowerCase().includes(filter) ?? false;
}

export function getNotCompletedInvocationCount(
  stages: { name: string; count: number }[],
) {
  return stages.reduce(
    (total, stage) => (stage.name === 'finished' ? total : total + stage.count),
    0,
  );
}

function handlerMatchesFilter(handler: Handler, filter: string) {
  return (
    includesFilter(handler.name, filter) ||
    includesFilter(handler.ty, filter) ||
    includesFilter(handler.input_description, filter) ||
    includesFilter(handler.output_description, filter)
  );
}

export function getServiceTableRows({
  servicesMap,
  deploymentsMap,
  filter,
  sortDescriptor,
  invocationCounts,
  serviceIssuesMap,
}: {
  servicesMap?: Map<string, Service>;
  deploymentsMap?: Map<string, Deployment>;
  filter: string;
  sortDescriptor: SortDescriptor;
  invocationCounts: Map<string, number>;
  serviceIssuesMap: Map<string, ServiceIssue[]>;
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const rows = Array.from(servicesMap?.values() ?? []).flatMap((service) => {
    const handlers = [...service.handlers].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!normalizedFilter) {
      return [
        {
          ...service,
          id: service.name,
          visibleHandlers: handlers,
          autoExpand: false,
        },
      ];
    }

    const deployment = deploymentsMap?.get(service.deployment_id);
    const serviceMatches =
      includesFilter(service.name, normalizedFilter) ||
      includesFilter(service.ty, normalizedFilter) ||
      includesFilter(service.deployment_id, normalizedFilter) ||
      includesFilter(getEndpoint(deployment), normalizedFilter);
    const matchingHandlers = handlers.filter((handler) =>
      handlerMatchesFilter(handler, normalizedFilter),
    );

    if (!serviceMatches && matchingHandlers.length === 0) {
      return [];
    }

    return [
      {
        ...service,
        id: service.name,
        visibleHandlers: serviceMatches ? handlers : matchingHandlers,
        autoExpand: !serviceMatches && matchingHandlers.length > 0,
      },
    ];
  });

  return sortServices(
    rows,
    sortDescriptor,
    invocationCounts,
    serviceIssuesMap,
    deploymentsMap,
  ) as OverviewServiceTableRow[];
}

function PlaygroundLink({
  serviceName,
  handlerName,
  isOnboarding = false,
  OnboardingGuide,
}: {
  serviceName: string;
  handlerName?: string;
  isOnboarding?: boolean;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const styles = tableStyles();
  const link = (
    <HoverTooltip content="Playground" disabled={isOnboarding}>
      <Link
        aria-label={`Open ${handlerName ? `${serviceName}/${handlerName}` : serviceName} in Playground`}
        href={panelHref({ playground: serviceName, handler: handlerName })}
        variant="secondary-button"
        className={styles.playground({
          className: isOnboarding
            ? 'animate-pulseButton bg-blue-50'
            : undefined,
        })}
        autoFocus={isOnboarding}
      >
        <Icon
          name={IconName.Play}
          className={
            isOnboarding
              ? 'ml-px h-3 w-3 fill-blue-500'
              : 'ml-px h-3 w-3 fill-blue-300 text-blue-700/0'
          }
        />
      </Link>
    </HoverTooltip>
  );

  if (!OnboardingGuide || handlerName) {
    return link;
  }

  return (
    <OnboardingGuide stage="open-playground" service={serviceName}>
      {link}
    </OnboardingGuide>
  );
}

function ServiceIdentity({
  row,
  isOnboarding,
  OnboardingGuide,
}: {
  row: OverviewServiceTableRow;
  isOnboarding: boolean;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const styles = tableStyles();
  return (
    <div className={styles.serviceIdentity()}>
      {row.handlers.length > 0 ? (
        <Button slot="chevron" variant="icon" className={styles.chevron()}>
          <Icon name={IconName.ChevronRight} className="h-full w-full" />
        </Button>
      ) : (
        <span aria-hidden className="h-5 w-5 shrink-0" />
      )}
      <ServiceTarget
        service={row.name}
        serviceType={row.ty}
        links={{
          service: {
            href: panelHref({ service: row.name }),
            ariaLabel: `Open service ${row.name}`,
          },
        }}
        density="default"
        className={styles.serviceTarget()}
      />
      <PlaygroundLink
        serviceName={row.name}
        isOnboarding={isOnboarding}
        OnboardingGuide={OnboardingGuide}
      />
      <div className={styles.serviceMetadata()}>
        {row.ty && (
          <ServiceType type={row.ty} className={styles.serviceType()} />
        )}
        <span className={styles.handlerCount()}>
          {formatNumber(row.handlers.length, true)}{' '}
          {formatPlurals(row.handlers.length, {
            one: 'handler',
            other: 'handlers',
          })}
        </span>
      </div>
    </div>
  );
}

function HandlerIdentity({
  service,
  handler,
  OnboardingGuide,
}: {
  service: Service;
  handler: Handler;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const styles = tableStyles();
  return (
    <div className={styles.handlerIdentity()}>
      <ServiceHandler
        handler={handler}
        service={service.name}
        serviceType={service.ty}
        showLink
        showType={false}
        className={styles.handler()}
      />
      <PlaygroundLink
        serviceName={service.name}
        handlerName={handler.name}
        OnboardingGuide={OnboardingGuide}
      />
    </div>
  );
}

function renderHandlerCell({
  service,
  row,
  column,
  baseUrl,
  linkParams,
  OnboardingGuide,
}: {
  service: Service;
  row: OverviewHandlerTableRow;
  column: PanelTableColumn;
  baseUrl: string;
  linkParams?: URLSearchParams;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const styles = tableStyles();
  if (column.id === 'name') {
    return (
      <Cell className={styles.identityCell()}>
        <HandlerIdentity
          service={service}
          handler={row.handler}
          OnboardingGuide={OnboardingGuide}
        />
      </Cell>
    );
  }
  if (column.id === 'invocations') {
    return (
      <Cell className={styles.handlerInvocationCell()}>
        <HoverTooltip
          content="View not-completed invocations"
          className={styles.handlerInvocationTooltip()}
        >
          <Link
            href={toServiceAndHandlerInvocationsHref(
              baseUrl,
              service.name,
              row.handler.name,
              { existingParams: linkParams, notCompletedOnly: true },
            )}
            variant="icon"
            aria-label={`View not-completed invocations for ${service.name}/${row.handler.name}`}
            className={styles.handlerInvocationLink()}
          >
            <Icon
              name={IconName.ChevronRight}
              className={styles.handlerInvocationIcon()}
            />
          </Link>
        </HoverTooltip>
      </Cell>
    );
  }
  return <Cell />;
}

function HandlerRows({
  service,
  columns,
  baseUrl,
  linkParams,
  OnboardingGuide,
}: {
  service: OverviewServiceTableRow;
  columns: PanelTableColumn[];
  baseUrl: string;
  linkParams?: URLSearchParams;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const styles = tableStyles();
  const handlers = service.visibleHandlers.map((handler) => ({
    id: handlerRowId(service.name, handler.name),
    handler,
  }));

  return (
    <Collection
      items={handlers}
      dependencies={[columns, baseUrl, linkParams, OnboardingGuide]}
    >
      {(row) => (
        <Row
          id={row.id}
          columns={columns}
          leadingCell={<Cell />}
          className={styles.childRow()}
        >
          {(column) =>
            renderHandlerCell({
              service,
              row,
              column,
              baseUrl,
              linkParams,
              OnboardingGuide,
            })
          }
        </Row>
      )}
    </Collection>
  );
}

export function ServicesTable() {
  const {
    filter,
    servicesMap,
    deploymentsMap,
    serviceStageCounts,
    servicesWithHighInbox,
    serviceIssuesMap,
    loadServiceInboxBreakdown,
    isServiceSummaryError,
    isServiceSummaryLoading,
    isDeploymentsFetching,
    baseUrl,
    linkParams,
    resolvedServiceSortDescriptor,
    setServiceSortDescriptor,
  } = useOverviewContext();
  const { OnboardingGuide } = useRestateContext();
  const isOnboarding = useOnboarding();
  const { open } = usePanel();
  const notCompletedInvocationCounts = useMemo(
    () =>
      new Map(
        [...serviceStageCounts].map(
          ([service, stages]) =>
            [service, getNotCompletedInvocationCount(stages)] as const,
        ),
      ),
    [serviceStageCounts],
  );
  const rows = useMemo(
    () =>
      getServiceTableRows({
        servicesMap,
        deploymentsMap,
        filter,
        sortDescriptor: resolvedServiceSortDescriptor,
        invocationCounts: notCompletedInvocationCounts,
        serviceIssuesMap,
      }),
    [
      deploymentsMap,
      filter,
      notCompletedInvocationCounts,
      resolvedServiceSortDescriptor,
      serviceIssuesMap,
      servicesMap,
    ],
  );
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(() => new Set());
  const rowIds = useMemo(() => new Set<Key>(rows.map(({ id }) => id)), [rows]);
  const autoExpandedKeys = useMemo(
    () =>
      new Set<Key>(
        rows.filter(({ autoExpand }) => autoExpand).map(({ id }) => id),
      ),
    [rows],
  );
  const visibleExpandedKeys = useMemo(
    () =>
      new Set<Key>([
        ...Array.from(expandedKeys).filter((key) => rowIds.has(key)),
        ...autoExpandedKeys,
      ]),
    [autoExpandedKeys, expandedKeys, rowIds],
  );
  const serviceRows = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const handlerRows = useMemo(
    () =>
      new Map(
        rows.flatMap((service) =>
          service.visibleHandlers.map(
            (handler) =>
              [
                handlerRowId(service.name, handler.name),
                { service, handler },
              ] as const,
          ),
        ),
      ),
    [rows],
  );
  const styles = tableStyles();

  return (
    <PanelTable
      aria-label="Services and handlers"
      columns={COLUMNS}
      items={rows}
      isLoading={isDeploymentsFetching}
      numOfRows={Math.max(rows.length, 6)}
      treeColumn="name"
      expandedKeys={visibleExpandedKeys}
      onExpandedChange={(nextExpandedKeys) => {
        setExpandedKeys((previous) => {
          const next = new Set(previous);
          for (const rowId of rowIds) {
            if (autoExpandedKeys.has(rowId)) continue;
            if (nextExpandedKeys.has(rowId)) {
              next.add(rowId);
            } else {
              next.delete(rowId);
            }
          }
          return next;
        });
      }}
      sortDescriptor={resolvedServiceSortDescriptor}
      onSortChange={(descriptor) =>
        setServiceSortDescriptor(descriptor ?? null)
      }
      onRowAction={(rowId) => {
        const service = serviceRows.get(String(rowId));
        if (service) {
          open(SERVICE_QUERY_PARAM, service.name);
          return;
        }
        const handler = handlerRows.get(String(rowId));
        if (handler) {
          open(SERVICE_QUERY_PARAM, handler.service.name, {
            [HANDLER_QUERY_PARAM]: handler.handler.name,
          });
        }
      }}
      rowClassName={styles.row()}
      bodyDependencies={[
        visibleExpandedKeys,
        notCompletedInvocationCounts,
        serviceStageCounts,
        serviceIssuesMap,
        isServiceSummaryLoading,
        isServiceSummaryError,
      ]}
      rowDependencies={[
        visibleExpandedKeys,
        notCompletedInvocationCounts,
        serviceStageCounts,
        serviceIssuesMap,
        isServiceSummaryLoading,
        isServiceSummaryError,
      ]}
      emptyPlaceholder={
        <EmptyState
          icon={IconName.Search}
          title="No matching services or handlers"
          description="Try adjusting your search."
        />
      }
      renderCell={(row, column) => {
        if (column.id === 'name') {
          return (
            <Cell className={styles.identityCell()}>
              <ServiceIdentity
                row={row}
                isOnboarding={isOnboarding}
                OnboardingGuide={OnboardingGuide}
              />
            </Cell>
          );
        }
        if (column.id === 'invocations') {
          const invocationCount =
            notCompletedInvocationCounts.get(row.name) ?? 0;
          const stageEntries = buildStatusEntries(
            (serviceStageCounts.get(row.name) ?? []).map(({ name, count }) => ({
              status: name,
              count,
            })),
          );
          const nonCompleted = stageEntries.filter(
            ({ name }) => name !== 'finished',
          );
          const notCompletedInvocationsHref = toServiceInvocationsHref(
            baseUrl,
            row.name,
            { existingParams: linkParams, notCompletedOnly: true },
          );
          const issues = serviceIssuesMap.get(row.name) ?? [];
          return (
            <Cell className={styles.invocationsCell()}>
              <Link
                href={notCompletedInvocationsHref}
                variant="secondary"
                aria-label={`${formatNumber(invocationCount)} not-completed invocations for ${row.name}`}
                className={styles.invocations()}
              >
                {isServiceSummaryLoading ? (
                  <span className="h-5 w-12 animate-pulse rounded-full bg-gray-200/70" />
                ) : (
                  <span className={styles.invocationCount()}>
                    {isServiceSummaryError
                      ? '—'
                      : formatNumber(invocationCount, true)}
                    <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                  </span>
                )}
                <div className={styles.invocationBar()}>
                  <ServiceStatusBar
                    serviceName={row.name}
                    statusEntries={nonCompleted}
                    serviceIssues={issues}
                    isLoading={isServiceSummaryLoading}
                    linkParams={linkParams}
                    rangeLabel="Not completed"
                    ariaLabel={`Not-completed invocation status for ${row.name}`}
                    totalLink={notCompletedInvocationsHref}
                    onOpenChange={(isOpen) => {
                      if (isOpen && servicesWithHighInbox.has(row.name)) {
                        void loadServiceInboxBreakdown(row.name);
                      }
                    }}
                  />
                </div>
              </Link>
            </Cell>
          );
        }
        if (column.id === 'health') {
          const issues = serviceIssuesMap.get(row.name) ?? [];
          return (
            <Cell className="[&&&]:overflow-visible">
              {isServiceSummaryLoading ? (
                <span className="block h-5 w-16 animate-pulse rounded-full bg-gray-200/70" />
              ) : issues.length > 0 ? (
                <IssueBadge
                  issues={issues}
                  serviceName={row.name}
                  baseUrl={baseUrl}
                  onOpenChange={(isOpen) => {
                    if (isOpen && servicesWithHighInbox.has(row.name)) {
                      void loadServiceInboxBreakdown(row.name);
                    }
                  }}
                />
              ) : null}
            </Cell>
          );
        }
        if (column.id === 'created_at') {
          const deployedAt = deploymentsMap?.get(row.deployment_id)?.created_at;
          return (
            <Cell>
              {deployedAt ? (
                <RelativeDate date={deployedAt} title="Deployed at" />
              ) : null}
            </Cell>
          );
        }
        if (column.id === 'deployment') {
          return (
            <Cell className="min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-center gap-1.5">
                <LatestRevisionDeployment serviceName={row.name} />
                <AllRevisions serviceName={row.name} />
              </div>
            </Cell>
          );
        }
        return <Cell />;
      }}
      renderChildRows={(row, columns) => (
        <HandlerRows
          service={row}
          columns={columns}
          baseUrl={baseUrl}
          linkParams={linkParams}
          OnboardingGuide={OnboardingGuide}
        />
      )}
    />
  );
}
