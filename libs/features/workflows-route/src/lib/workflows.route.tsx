import { useFeatures } from '@restate/data-access/admin-api';
import {
  useListServices,
  useListWorkflowRuns,
} from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import { Actions } from '@restate/features/invocation-route';
import {
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationId,
  InvocationTableCell,
  InvocationTableDate,
  Status,
} from '@restate/features/invocation-ui';
import { useRestateContext } from '@restate/features/restate-context';
import {
  workflowRunHref,
  WorkflowRunTarget,
  type WorkflowRunIdentity,
} from '@restate/features/workflow-run';
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
import { PRESERVED_QUERY_PARAMS } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import {
  Button as AriaButton,
  Input,
  Label,
  SearchField,
} from 'react-aria-components';
import { useNavigate, useSearchParams } from 'react-router';

const SERVICE_QUERY_PARAM = 'service';
const SEARCH_QUERY_PARAM = 'q';
const MAX_VISIBLE_SERVICE_TABS = 5;

type WorkflowRunSummary = components['schemas']['WorkflowRunSummary'];
type ColumnId =
  | 'identity'
  | 'status'
  | 'createdAt'
  | 'limit_key'
  | 'invocation'
  | 'actions';

interface WorkflowRunRow extends Omit<WorkflowRunSummary, 'id'> {
  id: string;
  workflowId: string;
}

function getColumns(hasVqueues: boolean) {
  return [
    {
      id: 'identity',
      name: 'Workflow run',
      isRowHeader: true,
      minWidth: 320,
    },
    { id: 'status', name: 'Status', minWidth: 190 },
    {
      id: 'createdAt',
      name: 'Created',
      defaultWidth: 140,
      minWidth: 110,
      maxWidth: 160,
    },
    ...(hasVqueues
      ? [
          {
            ...INVOCATION_TABLE_COLUMN_CONFIG.limit_key,
            id: 'limit_key' as const,
          },
        ]
      : []),
    {
      id: 'invocation',
      name: 'Invocation',
      defaultWidth: 180,
      minWidth: 160,
      maxWidth: 180,
    },
    {
      id: 'actions',
      name: 'Actions',
      width: 40,
      hideLabel: true,
    },
  ] satisfies PanelTableColumn<ColumnId>[];
}

function workflowIdentity(
  service: string,
  run: WorkflowRunRow,
): WorkflowRunIdentity {
  return {
    service,
    id: run.workflowId,
    ...(run.scope !== undefined ? { scope: run.scope } : {}),
  };
}

function workflowRunRouteHref(
  baseUrl: string,
  identity: WorkflowRunIdentity,
  searchParams: URLSearchParams,
) {
  return getHrefWithQueryParams({
    href: workflowRunHref(baseUrl, identity),
    preserveQueryParams: PRESERVED_QUERY_PARAMS,
    searchParams,
  });
}

function WorkflowsHero() {
  return (
    <section className="flex w-full flex-col gap-3 px-5 pt-14 pb-12 md:px-8 md:pt-16 md:pb-16">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-950">
        <Icon name={IconName.Workflow} className="h-6 w-6 text-zinc-400" />
        Workflows
      </h1>
      <p className="max-w-4xl text-base leading-7 text-zinc-500">
        Workflows are durable, multi-step processes identified by a service and
        workflow ID. Each workflow retains isolated state, its run handler
        executes exactly once for that identity, and shared handlers can
        interact with it concurrently.{' '}
        <Link
          href="https://docs.restate.dev/foundations/services#workflow"
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
  const columns = useMemo(() => getColumns(hasVqueues), [hasVqueues]);
  const filterLabel = hasVqueues
    ? 'Filter by Workflow id or scope'
    : 'Filter by Workflow id';
  const {
    data: serviceData,
    isPending: isServicesPending,
    error: servicesError,
  } = useListServices();
  const services = useMemo(
    () =>
      Array.from(serviceData.values())
        .filter((service) => service.ty === 'Workflow')
        .map((service) => service.name),
    [serviceData],
  );
  const requestedService = searchParams.get(SERVICE_QUERY_PARAM);
  const selectedService =
    services.find((service) => service === requestedService) ??
    services.at(0) ??
    '';
  const submittedSearch = searchParams.get(SEARCH_QUERY_PARAM)?.trim() ?? '';
  const setSubmittedSearch = (value: string) => {
    const nextSearch = value.trim();
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextSearch) next.set(SEARCH_QUERY_PARAM, nextSearch);
        else next.delete(SEARCH_QUERY_PARAM);
        return next;
      },
      { preventScrollReset: true },
    );
  };
  const {
    data,
    dataUpdatedAt,
    error: runsError,
    isFetching: isRunsFetching,
  } = useListWorkflowRuns(
    selectedService,
    submittedSearch ? { search: submittedSearch } : {},
    {
      enabled: Boolean(selectedService),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    },
  );
  const items = useMemo<WorkflowRunRow[]>(
    () =>
      (data?.rows ?? []).map((row) => ({
        ...row,
        id: JSON.stringify([row.id, row.scope]),
        workflowId: row.id,
      })),
    [data?.rows],
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
    isServicesPending || (Boolean(selectedService) && isRunsFetching && !data);
  const error = servicesError ?? runsError;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <WorkflowsHero />
      <ContentPanel tabs={tabs}>
        <ContentPanelToolbar className="justify-end px-1 pb-1">
          <SearchField
            key={submittedSearch}
            aria-label="Filter Workflow runs"
            defaultValue={submittedSearch}
            onSubmit={setSubmittedSearch}
            onClear={() => setSubmittedSearch('')}
            isDisabled={!selectedService}
            className="group min-w-0 flex-auto outline-none sm:max-w-[38ch]"
          >
            <Label className="sr-only">{filterLabel}</Label>
            <div className="relative min-h-7">
              <Input
                placeholder={`${filterLabel}…`}
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
                aria-label="Workflow runs"
                columns={columns}
                items={items}
                isLoading={isLoading}
                numOfRows={Math.max(items.length, 6)}
                bodyDependencies={[selectedService, submittedSearch, error]}
                onRowAction={(rowId) => {
                  const item = items.find(({ id }) => id === String(rowId));
                  if (item) {
                    navigate(
                      workflowRunRouteHref(
                        baseUrl,
                        workflowIdentity(selectedService, item),
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
                      title="Couldn’t load Workflows"
                    >
                      <ErrorBanner
                        error={error}
                        className="w-full rounded-xl text-left"
                      />
                    </EmptyState>
                  ) : services.length === 0 ? (
                    <EmptyState
                      icon={IconName.Workflow}
                      title="No Workflows registered"
                      description="Registered Workflow services will appear here."
                    />
                  ) : (
                    <EmptyState
                      icon={
                        submittedSearch ? IconName.Search : IconName.Workflow
                      }
                      title={
                        submittedSearch
                          ? 'No runs match this filter'
                          : 'No Workflow runs found'
                      }
                      description={
                        submittedSearch
                          ? 'Try a different Workflow id or scope.'
                          : 'Runs appear after a Workflow has been invoked.'
                      }
                    />
                  )
                }
                renderCell={(item, column) => {
                  const invocation = item.runInvocation;
                  if (column.id === 'status') {
                    return (
                      <Cell>
                        <Status invocation={invocation} />
                      </Cell>
                    );
                  }
                  if (column.id === 'createdAt') {
                    return (
                      <Cell>
                        <InvocationTableDate
                          value={invocation.created_at}
                          tooltipTitle="Run created at"
                        />
                      </Cell>
                    );
                  }
                  if (column.id === 'invocation') {
                    return (
                      <Cell className="overflow-visible">
                        <InvocationId
                          id={invocation.id}
                          truncateInMiddle
                          popover={false}
                        />
                      </Cell>
                    );
                  }
                  if (column.id === 'limit_key') {
                    return (
                      <InvocationTableCell
                        column={column.id}
                        className="align-middle"
                        row={invocation}
                        invocation={invocation}
                      />
                    );
                  }
                  if (column.id === 'actions') {
                    return (
                      <Cell className="align-top [&&&]:overflow-visible">
                        <Actions invocation={invocation} />
                      </Cell>
                    );
                  }
                  const identity = workflowIdentity(selectedService, item);
                  return (
                    <Cell className="overflow-visible">
                      <WorkflowRunTarget
                        identity={identity}
                        href={workflowRunRouteHref(
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
                    most recent runs; more exist.
                  </span>
                ) : (
                  <span>
                    <span className="font-medium text-gray-600">
                      {data.rows.length}
                    </span>{' '}
                    {data.rows.length === 1 ? 'run' : 'runs'}
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

export const workflows = { Component };
