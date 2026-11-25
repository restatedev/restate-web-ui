import {
  getEndpoint,
  isPublicHandler,
  isPublicService,
  type Deployment,
  type Handler,
} from '@restate/data-access-admin-api-spec';
import {
  AllRevisions,
  LatestRevisionDeployment,
} from '@restate/features-deployment';
import { getVisibleMetadataEntries } from '@restate/features-options';
import { useRestateContext } from '@restate/features-restate-context';
import {
  Handler as ServiceHandler,
  PlaygroundIconLink,
  PrivatePlayButton,
  QuickRunPlayButton,
  ServiceType,
} from '@restate/features-service';
import { ServiceTarget } from '@restate/features-service-target';
import {
  buildStatusEntries,
  ServiceStatusBar,
} from '@restate/features-status-chart';
import type { ServiceIssue } from '@restate/features-system-health';
import { Button } from '@restate/ui-button';
import { EmptyState } from '@restate/ui-empty-state';
import { Icon, IconName } from '@restate/ui-icons';
import { IssueBadge } from '@restate/ui-issue-banner';
import { Link } from '@restate/ui-link';
import { Spinner, Skeleton } from '@restate/ui-loading';
import {
  Cell,
  PanelTable,
  type PanelTableColumn,
  Row,
} from '@restate/ui-table';
import { HoverTooltip, RelativeDate } from '@restate/ui-tooltip';
import { toServiceAndHandlerInvocationsHref } from '@restate/util-invocation-links';
import {
  useIsFeatureFlagEnabled,
  useOnboarding,
} from '@restate/util-feature-flag';
import { panelHref, serviceHref } from '@restate/util-panel';
import { tv } from '@restate/util-styles';
import { NotCompletedInvocationsCell } from './NotCompletedInvocationsCell';
import { OVERVIEW_ROW_WAVE } from './overviewWave';
import {
  Collection,
  type Key,
  type SortDescriptor,
} from 'react-aria-components';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import { sortServices, type OverviewService } from './sortServices';
import {
  getMetadataGroupKey,
  getNextCollapsedGroups,
  groupServices,
} from './serviceGroups';
import {
  isServiceGroupRow,
  renderServiceGroupCell,
  type ServiceGroupTableRow,
} from './ServiceGroupCells';
import {
  useCollapsedServiceGroups,
  useServiceGroupBy,
} from './useServiceGroupBy';

type ServiceColumn =
  | 'name'
  | 'invocations'
  | 'health'
  | 'created_at'
  | 'deployment';

export interface OverviewServiceTableRow extends OverviewService {
  id: string;
  visibleHandlers: Handler[];
  autoExpand: boolean;
}

interface OverviewHandlerTableRow {
  id: string;
  handler: Handler;
}

type OverviewTableRow =
  | OverviewServiceTableRow
  | ServiceGroupTableRow<OverviewServiceTableRow>;

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
    id: 'health',
    name: 'Issues',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '0.5fr',
    minWidth: 70,
  },
  {
    id: 'invocations',
    name: 'Not completed invocations',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '1.5fr',
    minWidth: 190,
    maxWidth: 240,
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
    groupRow: 'cursor-pointer bg-subtle',
    childRow: 'cursor-pointer bg-subtle/30 hover:bg-muted/80',
    identityCell: '[&&&]:overflow-visible',
    serviceIdentity: 'flex min-w-0 items-center gap-2',
    serviceTarget:
      'min-w-0 flex-[0_1_auto] [&_[data-chip-root]]:text-[0.8125rem] [&_[data-chip-segment-inner]>svg]:h-3.5 [&_[data-chip-segment-inner]>svg]:w-3.5',
    serviceType: 'ml-auto',
    chevron:
      'h-5 w-5 shrink-0 rounded-md p-0.5 text-subtle group-data-[expanded=true]/row:rotate-90',
    chevronLoading: 'h-5 w-5 shrink-0 p-[3px] text-subtle',
    handlerIdentity: 'flex min-w-0 items-center gap-1.5 pl-7',
    handler: 'max-w-fit min-w-0 pr-0 pl-0',
    handlerInvocationCell: 'p-0!',
    handlerInvocationTooltip: 'h-full w-full',
    handlerInvocationLink:
      'h-full w-full justify-start rounded-none border-none bg-transparent px-2 py-2 text-subtle shadow-none hover:bg-tint-subtle hover:text-muted',
    handlerInvocationIcon: 'h-4 w-4',
    handlerInvocationBar: 'ml-auto min-w-3',
  },
  variants: {
    isGrouped: {
      true: {
        serviceIdentity: 'pl-7',
        handlerIdentity: 'pl-14',
      },
      false: {},
    },
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
  servicesMap?: Map<string, OverviewService>;
  deploymentsMap?: Map<string, Deployment>;
  filter: string;
  sortDescriptor: SortDescriptor;
  invocationCounts: Map<string, number>;
  serviceIssuesMap: Map<string, ServiceIssue[]>;
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const rows = Array.from(servicesMap?.values() ?? []).flatMap((service) => {
    const handlers = [...(service.handlers ?? [])].sort((a, b) =>
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
      includesFilter(getEndpoint(deployment), normalizedFilter) ||
      getVisibleMetadataEntries(service.metadata).some(([key, value]) =>
        includesFilter(`${key}:${value}`, normalizedFilter),
      );
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
  );
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
  OnboardingGuide?: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const isQuickRun = useIsFeatureFlagEnabled('FEATURE_NEW_PLAYGROUND');
  const target = handlerName ? `${serviceName}/${handlerName}` : serviceName;
  const link = isQuickRun ? (
    <QuickRunPlayButton
      aria-label={`Quick run ${target}`}
      service={serviceName}
      handler={handlerName}
      isHighlighted={isOnboarding}
    />
  ) : (
    <PlaygroundIconLink
      aria-label={`Open ${target} in Playground`}
      href={panelHref({ playground: serviceName, handler: handlerName })}
      isHighlighted={isOnboarding}
    />
  );

  if (!OnboardingGuide) {
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
  isGrouped,
}: {
  row: OverviewServiceTableRow;
  isOnboarding: boolean;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
  isGrouped: boolean;
}) {
  const styles = tableStyles({ isGrouped });
  const { baseUrl } = useRestateContext();
  const publicHandlers = row.handlers?.filter((handler) =>
    isPublicHandler(row, handler),
  );
  return (
    <div className={styles.serviceIdentity()}>
      {!row.handlers ? (
        <span
          role="status"
          aria-label="Loading handlers"
          className={styles.chevronLoading()}
        >
          <Spinner className="h-full w-full" />
        </span>
      ) : row.handlers.length > 0 ? (
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
            href: serviceHref(baseUrl, { service: row.name }),
            ariaLabel: `Open service ${row.name}`,
          },
        }}
        density="default"
        className={styles.serviceTarget()}
      />
      {isPublicService(row) ? (
        <PlaygroundLink
          serviceName={row.name}
          // Open a single-handler service on its handler, not the overview.
          handlerName={
            publicHandlers?.length === 1 ? publicHandlers[0]?.name : undefined
          }
          isOnboarding={isOnboarding}
          OnboardingGuide={OnboardingGuide}
        />
      ) : (
        <PrivatePlayButton />
      )}
      {row.ty && (
        <ServiceType
          type={row.ty}
          variant="subtle"
          className={styles.serviceType()}
        />
      )}
    </div>
  );
}

function HandlerIdentity({
  service,
  handler,
  isGrouped,
}: {
  service: OverviewService;
  handler: Handler;
  isGrouped: boolean;
}) {
  const styles = tableStyles({ isGrouped });
  return (
    <div className={styles.handlerIdentity()}>
      <ServiceHandler
        handler={handler}
        service={service.name}
        serviceType={service.ty}
        showLink
        showType={false}
        compact
        className={styles.handler()}
      />
      {isPublicHandler(service, handler) ? (
        <PlaygroundLink serviceName={service.name} handlerName={handler.name} />
      ) : (
        <PrivatePlayButton />
      )}
    </div>
  );
}

type HandlerInvocations = {
  stageCounts?: Map<string, { name: string; count: number }[]>;
  serviceTotals: Map<string, number>;
  isLoading: boolean;
  isError: boolean;
};

function renderHandlerCell({
  service,
  row,
  column,
  baseUrl,
  linkParams,
  handlerInvocations,
  isGrouped,
}: {
  service: OverviewService;
  row: OverviewHandlerTableRow;
  column: PanelTableColumn;
  baseUrl: string;
  linkParams?: URLSearchParams;
  handlerInvocations: HandlerInvocations;
  isGrouped: boolean;
}) {
  const styles = tableStyles();
  if (column.id === 'name') {
    return (
      <Cell className={styles.identityCell()}>
        <HandlerIdentity
          service={service}
          handler={row.handler}
          isGrouped={isGrouped}
        />
      </Cell>
    );
  }
  if (column.id === 'invocations' && handlerInvocations.stageCounts) {
    const stages =
      handlerInvocations.stageCounts.get(
        handlerRowId(service.name, row.handler.name),
      ) ?? [];
    const label = `${service.name}/${row.handler.name}`;
    const count = getNotCompletedInvocationCount(stages);
    const serviceTotal =
      handlerInvocations.serviceTotals.get(service.name) ?? 0;
    const share = serviceTotal > 0 ? Math.min(1, count / serviceTotal) : 0;
    return (
      <NotCompletedInvocationsCell
        label={label}
        count={count}
        isLoading={handlerInvocations.isLoading}
        isError={handlerInvocations.isError}
      >
        <div
          className={styles.handlerInvocationBar()}
          style={{ width: `${share * 100}%` }}
        >
          <ServiceStatusBar
            serviceName={service.name}
            handlerName={row.handler.name}
            statusEntries={buildStatusEntries(
              stages.map(({ name, count }) => ({ status: name, count })),
            ).filter(({ name }) => name !== 'finished')}
            isLoading={handlerInvocations.isLoading}
            linkParams={linkParams}
            rangeLabel="Not completed"
            ariaLabel={`Not-completed invocation status for ${label}`}
            totalLink={serviceHref(baseUrl, {
              service: service.name,
              handler: row.handler.name,
            })}
          />
        </div>
      </NotCompletedInvocationsCell>
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
  handlerInvocations,
  isGrouped,
}: {
  service: OverviewServiceTableRow;
  columns: PanelTableColumn[];
  baseUrl: string;
  linkParams?: URLSearchParams;
  handlerInvocations: HandlerInvocations;
  isGrouped: boolean;
}) {
  const styles = tableStyles();
  const handlers = service.visibleHandlers.map((handler) => ({
    id: handlerRowId(service.name, handler.name),
    handler,
  }));

  return (
    <Collection
      items={handlers}
      dependencies={[
        columns,
        baseUrl,
        linkParams,
        handlerInvocations,
        isGrouped,
      ]}
    >
      {(row) => (
        <Row
          id={row.id}
          columns={columns}
          hasLeadingCell
          className={styles.childRow()}
          dataAttributes={OVERVIEW_ROW_WAVE}
        >
          {(column) =>
            renderHandlerCell({
              service,
              row,
              column,
              baseUrl,
              linkParams,
              handlerInvocations,
              isGrouped,
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
    handlerStageCounts,
    isSummaryFromStats,
    servicesWithHighInbox,
    serviceIssuesMap,
    loadServiceInboxBreakdown,
    isServiceSummaryError,
    isServiceSummaryLoading,
    isDeploymentsFetching,
    isServicesPending,
    isServiceDetailsPending,
    baseUrl,
    linkParams,
    resolvedServiceSortDescriptor,
    setServiceSortDescriptor,
  } = useOverviewContext();
  const { OnboardingGuide } = useRestateContext();
  const isOnboarding = useOnboarding();
  const navigate = useNavigate();
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
  const handlerInvocations = useMemo<HandlerInvocations>(
    () => ({
      stageCounts: isSummaryFromStats ? handlerStageCounts : undefined,
      serviceTotals: notCompletedInvocationCounts,
      isLoading: isServiceSummaryLoading,
      isError: isServiceSummaryError,
    }),
    [
      handlerStageCounts,
      isServiceSummaryError,
      isServiceSummaryLoading,
      isSummaryFromStats,
      notCompletedInvocationCounts,
    ],
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
  const [groupBy] = useServiceGroupBy();
  const isGrouped = groupBy !== 'none';
  const isGroupMetadataPending =
    getMetadataGroupKey(groupBy) !== undefined && isServiceDetailsPending;
  const groupRows = useMemo<ServiceGroupTableRow<OverviewServiceTableRow>[]>(
    () =>
      isGrouped
        ? groupServices(
            rows,
            groupBy,
            (deploymentId) =>
              getEndpoint(deploymentsMap?.get(deploymentId)) ?? deploymentId,
          ).map((group) => ({ id: group.id, kind: 'group', group }))
        : [],
    [deploymentsMap, groupBy, isGrouped, rows],
  );
  const [collapsedGroups, setCollapsedGroups] = useCollapsedServiceGroups(
    groupBy,
    filter,
  );
  const tableExpandedKeys = useMemo(
    () =>
      new Set<Key>([
        ...visibleExpandedKeys,
        ...groupRows
          .filter(({ id }) => !collapsedGroups.has(id))
          .map(({ id }) => id),
      ]),
    [collapsedGroups, groupRows, visibleExpandedKeys],
  );
  const items: OverviewTableRow[] = isGrouped ? groupRows : rows;
  const rowDependencies = [
    groupBy,
    visibleExpandedKeys,
    notCompletedInvocationCounts,
    serviceStageCounts,
    serviceIssuesMap,
    isServiceSummaryLoading,
    isServiceSummaryError,
  ];
  const toggleGroup = (groupId: string) => {
    const next = new Set(collapsedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setCollapsedGroups(next);
  };
  const renderHandlerRows = (
    service: OverviewServiceTableRow,
    columns: PanelTableColumn[],
  ) => (
    <HandlerRows
      service={service}
      columns={columns}
      baseUrl={baseUrl}
      linkParams={linkParams}
      handlerInvocations={handlerInvocations}
      isGrouped={isGrouped}
    />
  );
  const renderServiceCell = (
    row: OverviewServiceTableRow,
    column: PanelTableColumn,
  ) => {
    if (column.id === 'name') {
      return (
        <Cell className={styles.identityCell()}>
          <ServiceIdentity
            row={row}
            isOnboarding={isOnboarding}
            OnboardingGuide={OnboardingGuide}
            isGrouped={isGrouped}
          />
        </Cell>
      );
    }
    if (column.id === 'invocations') {
      const invocationCount = notCompletedInvocationCounts.get(row.name) ?? 0;
      const stageEntries = buildStatusEntries(
        (serviceStageCounts.get(row.name) ?? []).map(({ name, count }) => ({
          status: name,
          count,
        })),
      );
      const nonCompleted = stageEntries.filter(
        ({ name }) => name !== 'finished',
      );
      const serviceInvocationsHref = serviceHref(baseUrl, {
        service: row.name,
      });
      const issues = serviceIssuesMap.get(row.name) ?? [];
      return (
        <NotCompletedInvocationsCell
          label={row.name}
          count={invocationCount}
          isLoading={isServiceSummaryLoading}
          isError={isServiceSummaryError}
        >
          <ServiceStatusBar
            serviceName={row.name}
            statusEntries={nonCompleted}
            serviceIssues={issues}
            isLoading={isServiceSummaryLoading}
            linkParams={linkParams}
            rangeLabel="Not completed"
            ariaLabel={`Not-completed invocation status for ${row.name}`}
            totalLink={serviceInvocationsHref}
            onOpenChange={(isOpen) => {
              if (isOpen && servicesWithHighInbox.has(row.name)) {
                void loadServiceInboxBreakdown(row.name);
              }
            }}
          />
        </NotCompletedInvocationsCell>
      );
    }
    if (column.id === 'health') {
      const issues = serviceIssuesMap.get(row.name) ?? [];
      return (
        <Cell className="[&&&]:overflow-visible">
          {isServiceSummaryLoading ? (
            <Skeleton shape="pill" className="block h-5 w-16" />
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
  };

  return (
    <PanelTable<OverviewTableRow, ServiceColumn>
      aria-label="Services and handlers"
      columns={COLUMNS}
      columnWidthsStorageKey="services-user-col-widths"
      items={items}
      isLoading={
        isDeploymentsFetching || isServicesPending || isGroupMetadataPending
      }
      numOfRows={Math.max(rows.length + groupRows.length, 6)}
      treeColumn="name"
      expandedKeys={tableExpandedKeys}
      onExpandedChange={(nextExpandedKeys) => {
        if (isGrouped) {
          const nextCollapsed = getNextCollapsedGroups(
            collapsedGroups,
            groupRows.map(({ id }) => id),
            nextExpandedKeys,
          );
          if (nextCollapsed) {
            setCollapsedGroups(nextCollapsed);
          }
        }
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
        const key = String(rowId);
        if (groupRows.some(({ id }) => id === key)) {
          toggleGroup(key);
          return;
        }
        const service = serviceRows.get(key);
        if (service) {
          navigate(serviceHref(baseUrl, { service: service.name }));
          return;
        }
        const handler = handlerRows.get(key);
        if (handler) {
          navigate(
            serviceHref(baseUrl, {
              service: handler.service.name,
              handler: handler.handler.name,
            }),
          );
        }
      }}
      rowClassName={(row) =>
        isServiceGroupRow(row) ? styles.groupRow() : styles.row()
      }
      rowDataAttributes={() => OVERVIEW_ROW_WAVE}
      bodyDependencies={rowDependencies}
      rowDependencies={rowDependencies}
      emptyPlaceholder={
        <EmptyState
          icon={IconName.Search}
          title="No matching services or handlers"
          description="Try adjusting your search."
        />
      }
      renderCell={(row, column) =>
        isServiceGroupRow<OverviewServiceTableRow>(row)
          ? renderServiceGroupCell({
              row,
              column,
              groupBy,
              chevronClassName: styles.chevron(),
              deploymentsMap,
              stageCounts: serviceStageCounts,
              serviceIssuesMap,
              isLoading: isServiceSummaryLoading,
              isError: isServiceSummaryError,
            })
          : renderServiceCell(row, column)
      }
      renderChildRows={(row, columns) =>
        isServiceGroupRow<OverviewServiceTableRow>(row) ? (
          <Collection
            items={row.group.services}
            dependencies={[...rowDependencies, columns]}
          >
            {(service) => (
              <Row
                id={service.id}
                columns={columns}
                hasLeadingCell
                className={styles.row()}
                dataAttributes={OVERVIEW_ROW_WAVE}
                dependencies={[...rowDependencies, columns]}
                childRows={renderHandlerRows(service, columns)}
              >
                {(column) => renderServiceCell(service, column)}
              </Row>
            )}
          </Collection>
        ) : (
          renderHandlerRows(row, columns)
        )
      }
    />
  );
}
