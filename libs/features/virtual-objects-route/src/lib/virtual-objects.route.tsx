import { useFeatures } from '@restate/data-access/admin-api';
import {
  useListServices,
  useListVirtualObjectInstances,
} from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  InvocationId,
  InvocationTableDate,
} from '@restate/features/invocation-ui';
import {
  virtualObjectInstanceHref,
  type VirtualObjectInstanceIdentity,
  VirtualObjectInstanceTarget,
} from '@restate/features/virtual-object-instance';
import { useRestateContext } from '@restate/features/restate-context';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { getHrefWithQueryParams, Link } from '@restate/ui/link';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { formatNumber } from '@restate/util/intl';
import { PRESERVED_QUERY_PARAMS } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useMemo } from 'react';
import {
  Button as AriaButton,
  Input,
  Label,
  SearchField,
  type SortDescriptor,
} from 'react-aria-components';
import { useNavigate, useSearchParams } from 'react-router';

const SERVICE_QUERY_PARAM = 'service';
const SEARCH_QUERY_PARAM = 'q';
const SORT_QUERY_PARAM = 'sort';
const BACKLOG_SORT = 'backlog';
const MAX_VISIBLE_SERVICE_TABS = 5;

type ColumnId = 'identity' | 'backlog' | 'lockHolder' | 'lockAcquired';
type VirtualObjectInstanceSummary =
  components['schemas']['VirtualObjectInstanceSummary'];
type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];

interface VirtualObjectInstanceRow extends VirtualObjectInstanceSummary {
  id: string;
}

function virtualObjectIdentity(
  service: string,
  instance: VirtualObjectInstanceRow,
): VirtualObjectInstanceIdentity {
  return {
    service,
    key: instance.key,
    ...(instance.scope !== undefined ? { scope: instance.scope } : {}),
  };
}

function virtualObjectInstanceRouteHref(
  baseUrl: string,
  identity: VirtualObjectInstanceIdentity,
  searchParams: URLSearchParams,
) {
  return getHrefWithQueryParams({
    href: virtualObjectInstanceHref(baseUrl, identity),
    preserveQueryParams: PRESERVED_QUERY_PARAMS,
    searchParams,
  });
}

const columns: PanelTableColumn<ColumnId>[] = [
  {
    id: 'identity',
    name: 'Virtual object instance',
    isRowHeader: true,
    minWidth: 320,
  },
  {
    id: 'backlog',
    name: 'Inbox',
    allowsSorting: true,
    defaultWidth: 220,
    minWidth: 180,
  },
  {
    id: 'lockHolder',
    name: 'Lock holder',
    defaultWidth: 300,
    minWidth: 240,
  },
];

const lockAcquiredColumn: PanelTableColumn<ColumnId> = {
  id: 'lockAcquired',
  name: 'Lock acquired',
  defaultWidth: 150,
  minWidth: 120,
};

const backlogMeterStyles = tv({
  slots: {
    root: 'flex w-full max-w-48 items-center gap-2 pr-2',
    track:
      'flex h-3 min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5',
    fill: 'h-full rounded-full outline-1 transition-[width]',
    value:
      'min-w-5 shrink-0 text-right text-xs font-medium text-zinc-600 tabular-nums',
  },
  variants: {
    severity: {
      warning: {
        fill: 'bg-amber-200 outline-amber-300',
      },
      alert: {
        fill: 'bg-red-200 outline-red-300',
      },
    },
  },
});

function BacklogCell({
  backlog,
  maxBacklog,
}: {
  backlog: number;
  maxBacklog: number;
}) {
  if (backlog <= 0) {
    return (
      <span className="text-xs font-medium text-zinc-300 tabular-nums">0</span>
    );
  }

  const ratio = backlog / Math.max(maxBacklog, 1);
  const severity = ratio >= 0.5 ? 'alert' : 'warning';
  const { root, track, fill, value } = backlogMeterStyles({ severity });

  return (
    <div className={root()}>
      <div className={track()}>
        <div
          className={fill()}
          style={{
            width: `${Math.max(4, ratio * 100)}%`,
            minWidth: 4,
          }}
        />
      </div>
      <span className={value()}>{formatNumber(backlog)}</span>
    </div>
  );
}

function LockHolderCell({
  lockHolder,
}: {
  lockHolder?: VirtualObjectLockHolder;
}) {
  if (!lockHolder) {
    return <span className="text-zinc-400">—</span>;
  }
  if (lockHolder.kind === 'invocation') {
    return <InvocationId id={lockHolder.id} />;
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon
        name={
          lockHolder.kind === 'state-mutation'
            ? IconName.Database
            : IconName.Security
        }
        className="h-4 w-4 shrink-0 text-zinc-400"
      />
      <span className="shrink-0 text-sm text-zinc-600">
        {lockHolder.kind === 'state-mutation' ? 'State mutation' : 'Other'}
      </span>
      <code className="truncate text-xs text-zinc-500">{lockHolder.id}</code>
    </div>
  );
}

function VirtualObjectsHero({
  hasScopedVirtualObjects,
}: {
  hasScopedVirtualObjects: boolean;
}) {
  const identityDescription = hasScopedVirtualObjects
    ? 'a service, key, and optional scope'
    : 'a service and key';

  return (
    <section className="flex w-full flex-col gap-3 px-5 pt-14 pb-12 md:px-8 md:pt-16 md:pb-16">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-950">
        <Icon name={IconName.VirtualObject} className="h-6 w-6 text-zinc-400" />
        Virtual Objects
      </h1>
      <p className="max-w-4xl text-base leading-7 text-zinc-500">
        Virtual Objects are stateful entities identified by{' '}
        {identityDescription}. Each instance has persistent K/V state. Restate
        runs at most one exclusive handler at a time per instance, while shared
        handlers can run concurrently.{' '}
        <Link
          href="https://docs.restate.dev/foundations/services#virtual-object"
          variant="secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </Link>
      </p>
    </section>
  );
}

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();
  const features = useFeatures();
  const hasVqueues = features.has('vqueues');
  const hasScopedVirtualObjects =
    hasVqueues && features.has('scoped_virtual_objects');
  const instanceFilterLabel = hasScopedVirtualObjects
    ? 'Filter by key or scope'
    : 'Filter by key';
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
  const submittedSearch = searchParams.get(SEARCH_QUERY_PARAM)?.trim() ?? '';
  const sortByBacklog = searchParams.get(SORT_QUERY_PARAM) === BACKLOG_SORT;
  const sortDescriptor: SortDescriptor | undefined = sortByBacklog
    ? { column: 'backlog', direction: 'descending' }
    : undefined;

  const setSubmittedSearch = (value: string) => {
    const nextSearch = value.trim();
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextSearch) {
          next.set(SEARCH_QUERY_PARAM, nextSearch);
        } else {
          next.delete(SEARCH_QUERY_PARAM);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  };

  const toggleBacklogSort = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (sortByBacklog) {
          next.delete(SORT_QUERY_PARAM);
        } else {
          next.set(SORT_QUERY_PARAM, BACKLOG_SORT);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  };

  const {
    data,
    dataUpdatedAt,
    error: instancesError,
    isFetching: isInstancesFetching,
  } = useListVirtualObjectInstances(
    selectedService,
    {
      ...(submittedSearch ? { search: submittedSearch } : {}),
      ...(sortByBacklog
        ? { sort: { field: BACKLOG_SORT, order: 'DESC' as const } }
        : {}),
    },
    {
      enabled: Boolean(selectedService),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    },
  );
  const items = useMemo<VirtualObjectInstanceRow[]>(
    () =>
      (data?.rows ?? []).map((row) => ({
        ...row,
        id: JSON.stringify([row.key, row.scope]),
      })),
    [data?.rows],
  );
  const maxBacklog = useMemo(
    () => items.reduce((maximum, item) => Math.max(maximum, item.backlog), 0),
    [items],
  );
  const visibleColumns = useMemo(
    () => (hasVqueues ? [...columns, lockAcquiredColumn] : columns),
    [hasVqueues],
  );
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
  const isLoading =
    isServicesPending ||
    (Boolean(selectedService) && isInstancesFetching && !data);
  const error = servicesError ?? instancesError;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <VirtualObjectsHero hasScopedVirtualObjects={hasScopedVirtualObjects} />
      <ContentPanel tabs={tabs}>
        <ContentPanelToolbar className="justify-end px-1 pb-1">
          <SearchField
            key={submittedSearch}
            aria-label="Filter Virtual Object instances"
            defaultValue={submittedSearch}
            onSubmit={setSubmittedSearch}
            onClear={() => setSubmittedSearch('')}
            isDisabled={!selectedService}
            className="group min-w-0 flex-auto outline-none sm:max-w-[38ch]"
          >
            <Label className="sr-only">{instanceFilterLabel}</Label>
            <div className="relative min-h-7">
              <Input
                placeholder={`${instanceFilterLabel}…`}
                className="mt-0 h-7 w-full min-w-0 rounded-lg border border-gray-200 bg-white/70 px-2 py-0.5 pr-8 pl-7 text-sm text-gray-800 shadow-xs outline-offset-2 placeholder:text-gray-500/75 hover:bg-white focus:border-blue-500/30 focus:bg-white focus:ring-0 focus:outline-2 focus:outline-blue-600 disabled:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              <Icon
                name={IconName.Search}
                className="pointer-events-none absolute top-0 bottom-0 left-1.5 aspect-square h-full p-1 text-gray-400"
              />
              <AriaButton
                aria-label="Clear filter"
                className="absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 outline-offset-1 group-empty:hidden hover:bg-zinc-200/60 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icon name={IconName.X} className="h-3.5 w-3.5" />
              </AriaButton>
            </div>
          </SearchField>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
              <PanelTable
                aria-label="Virtual Object instances"
                columns={visibleColumns}
                items={items}
                isLoading={isLoading}
                numOfRows={Math.max(items.length, 6)}
                bodyDependencies={[
                  selectedService,
                  submittedSearch,
                  sortByBacklog,
                  maxBacklog,
                  error,
                ]}
                sortDescriptor={sortDescriptor}
                onSortChange={toggleBacklogSort}
                onRowAction={(rowId) => {
                  const item = items.find(({ id }) => id === String(rowId));
                  if (item) {
                    navigate(
                      virtualObjectInstanceRouteHref(
                        baseUrl,
                        virtualObjectIdentity(selectedService, item),
                        searchParams,
                      ),
                    );
                  }
                }}
                rowClassName="cursor-pointer"
                emptyPlaceholder={
                  error ? (
                    <EmptyState
                      icon={IconName.TriangleAlert}
                      intent="danger"
                      title="Couldn’t load Virtual Objects"
                    >
                      <ErrorBanner
                        error={error}
                        className="w-full rounded-xl text-left"
                      />
                    </EmptyState>
                  ) : services.length === 0 ? (
                    <EmptyState
                      icon={IconName.VirtualObject}
                      title="No Virtual Objects registered"
                      description="Registered Virtual Object services will appear here."
                    />
                  ) : (
                    <EmptyState
                      icon={IconName.Search}
                      title={
                        submittedSearch
                          ? 'No instances match this filter'
                          : 'No instances found'
                      }
                      description={
                        submittedSearch
                          ? 'Try a different key or scope.'
                          : 'Instances appear after they store state or receive work.'
                      }
                    />
                  )
                }
                renderCell={(item, column) => {
                  if (column.id === 'backlog') {
                    return (
                      <Cell>
                        <BacklogCell
                          backlog={item.backlog}
                          maxBacklog={maxBacklog}
                        />
                      </Cell>
                    );
                  }
                  if (column.id === 'lockHolder') {
                    return (
                      <Cell className="overflow-visible">
                        <LockHolderCell lockHolder={item.lockHolder} />
                      </Cell>
                    );
                  }
                  if (column.id === 'lockAcquired') {
                    return (
                      <Cell>
                        {item.lockHolder?.acquiredAt ? (
                          <InvocationTableDate
                            value={item.lockHolder.acquiredAt}
                            tooltipTitle="Lock acquired at"
                          />
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </Cell>
                    );
                  }
                  const identity = virtualObjectIdentity(selectedService, item);
                  return (
                    <Cell className="overflow-visible">
                      <VirtualObjectInstanceTarget
                        identity={identity}
                        href={virtualObjectInstanceRouteHref(
                          baseUrl,
                          identity,
                          searchParams,
                        )}
                        showService={false}
                      />
                    </Cell>
                  );
                }}
              />
            </SnapshotTimeProvider>
            {data && (
              <div className="flex justify-end px-4 pt-3 pb-2 text-xs text-gray-500/80">
                {data.truncated ? (
                  <span>
                    Showing the{' '}
                    <span className="font-medium text-gray-600">
                      {data.rows.length}
                    </span>{' '}
                    {sortByBacklog
                      ? 'highest-backlog instances; more exist.'
                      : 'instances; more exist.'}
                  </span>
                ) : (
                  <span>
                    <span className="font-medium text-gray-600">
                      {data.rows.length}
                    </span>{' '}
                    {data.rows.length === 1 ? 'instance' : 'instances'}
                  </span>
                )}
              </div>
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

export const virtualObjects = { Component };
