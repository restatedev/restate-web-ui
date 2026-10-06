import { useFeatures } from '@restate/data-access/admin-api';
import { useListWorkflowRuns } from '@restate/data-access/admin-api-hooks';
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
import { Button } from '@restate/ui/button';
import {
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  FilteredResultsCaption,
  QueryClause,
  QueryClauseType,
  useFilterBuilder,
} from '@restate/ui/filter-builder';
import { Icon, IconName } from '@restate/ui/icons';
import { getHrefWithQueryParams } from '@restate/ui/link';
import {
  Cell,
  PanelTable,
  PanelTableQuickOpenCaption,
  type PanelTableColumn,
} from '@restate/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { PRESERVED_QUERY_PARAMS } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Form, useNavigate, useSearchParams } from 'react-router';
import {
  createWorkflowIdFilter,
  readWorkflowFilters,
  toWorkflowFilters,
  workflowFilterSchema,
  writeWorkflowFilters,
} from './workflows.filters';
import { WorkflowQuickOpen } from './WorkflowQuickOpen';
import {
  type WorkflowOpenDraft,
  workflowIdentityFromOpenDraft,
} from './workflows.open';

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: { isFetching: { true: 'animate-spin' } },
});

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

export function WorkflowRuns({
  service,
  hasServices = true,
  isServicesPending = false,
  servicesError = null,
}: {
  service: string;
  hasServices?: boolean;
  isServicesPending?: boolean;
  servicesError?: Error | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();
  const features = useFeatures();
  const hasVqueues = features.has('vqueues');
  const [openWorkflowDraft, setOpenWorkflowDraft] = useState<WorkflowOpenDraft>(
    { id: '', scope: '' },
  );
  const columns = useMemo(() => getColumns(hasVqueues), [hasVqueues]);
  const filterSchema = useMemo(
    () => workflowFilterSchema(hasVqueues),
    [hasVqueues],
  );
  const searchString = searchParams.toString();
  const committedFilters = useMemo(
    () => readWorkflowFilters(new URLSearchParams(searchString), filterSchema),
    [filterSchema, searchString],
  );
  const filterQuery = useFilterBuilder(committedFilters);
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Removing a filter updates the list before this callback runs, but the
  // current render still exposes the old items. Defer submission until React
  // commits the removal so the URL is written from the updated list.
  // TODO: Have FilterBuilder provide the next items and remove this timer.
  const scheduleSubmit = useCallback(() => {
    clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(
      () => formRef.current?.requestSubmit(),
      0,
    );
  }, []);
  const filters = useMemo(
    () => toWorkflowFilters(committedFilters),
    [committedFilters],
  );
  const hasFilters = filters.length > 0;
  const applyWorkflowIdFilter = useCallback(
    (input: string) => {
      const clause = createWorkflowIdFilter(input);
      if (!clause) return false;
      if (filterQuery.getItem(clause.id)) {
        filterQuery.update(clause.id, clause);
      } else {
        filterQuery.append(clause);
      }
      scheduleSubmit();
      return true;
    },
    [filterQuery, scheduleSubmit],
  );
  const renderFilterOption = useCallback(
    (item: QueryClause<QueryClauseType>) => (
      <div className="flex items-baseline gap-2">
        <span>{item.label}</span>
        <span className="font-mono text-xs opacity-60">
          {item.operations.map((operation) => operation.label).join(' / ')}
        </span>
      </div>
    ),
    [],
  );
  const confirmOpenWorkflow = useCallback(() => {
    const identity = workflowIdentityFromOpenDraft(
      service,
      openWorkflowDraft,
      hasVqueues,
    );
    if (!identity) return;
    navigate(workflowRunRouteHref(baseUrl, identity, searchParams));
  }, [baseUrl, hasVqueues, navigate, openWorkflowDraft, searchParams, service]);
  const {
    data,
    dataUpdatedAt,
    error: runsError,
    isFetching: isRunsFetching,
    refetch: refetchRuns,
  } = useListWorkflowRuns(service, filters.length > 0 ? { filters } : {}, {
    enabled: Boolean(service),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  });
  const items = useMemo<WorkflowRunRow[]>(
    () =>
      (data?.rows ?? []).map((row) => ({
        ...row,
        id: JSON.stringify([row.id, row.scope]),
        workflowId: row.id,
      })),
    [data?.rows],
  );
  const isLoading = isServicesPending || (Boolean(service) && isRunsFetching);
  const error = servicesError ?? runsError;
  const filteredResultsCaption = hasFilters ? (
    <FilteredResultsCaption
      noun="workflow runs"
      className="m-0 h-9 w-full shrink-0 rounded-xl px-2.5"
      onClear={() =>
        setSearchParams(writeWorkflowFilters(searchParams, []), {
          preventScrollReset: true,
        })
      }
    />
  ) : undefined;

  return (
    <>
      <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
        <Form
          ref={formRef}
          className="hidden min-w-0 flex-auto sm:block"
          onSubmit={(event) => {
            event.preventDefault();
            const next = writeWorkflowFilters(searchParams, filterQuery.items);
            setSearchParams(next, { preventScrollReset: true });
          }}
        >
          <FilterBuilder query={filterQuery} schema={filterSchema} multiple>
            <AddFilterTrigger
              placeholder="Filter Workflow runs…"
              title="Workflow filters"
              disabled={!service}
              onInputSubmit={applyWorkflowIdFilter}
              onItemRemove={scheduleSubmit}
              renderOption={renderFilterOption}
              inputPrefix={
                <Icon
                  name={IconName.Search}
                  className="h-4 w-4 shrink-0 text-gray-400"
                />
              }
              tagsPlacement="outside"
              maxVisibleChips="auto"
              chipOverflowStrategy="all"
              tagGroupClassName="min-w-0 flex-nowrap"
              showSectionTitle={false}
              popoverPlacement="bottom start"
              popoverClassName="w-80 min-w-80 max-w-[calc(100vw-2rem)] bg-white/95 p-1"
              optionClassName="gap-2 px-2.5 py-1.5 data-[focused]:bg-blue-50 data-[focused]:text-blue-900 hover:bg-blue-50 hover:text-blue-900"
              className="min-h-6.5 w-full justify-end text-gray-800"
              inputClassName="min-h-6.5 max-w-[38ch] flex-[0_1_38ch] bg-white/70 shadow-xs hover:bg-white [&_input]:h-6 [&_input]:min-h-6 [&_input]:py-0.5 [&_input]:placeholder:text-gray-500/75"
            >
              {(props) => (
                <FilterChip
                  {...props}
                  appearance="light"
                  showRemove
                  popoverPlacement="bottom"
                />
              )}
            </AddFilterTrigger>
          </FilterBuilder>
        </Form>
        <Tooltip>
          <TooltipTrigger>
            <Button
              type="button"
              variant="icon"
              aria-label={
                isRunsFetching ? 'Refreshing Workflows' : 'Refresh Workflows'
              }
              className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
              onClick={() => void refetchRuns()}
              disabled={!service || isRunsFetching}
            >
              <Icon
                name={IconName.Retry}
                className={refreshIconStyles({
                  isFetching: isRunsFetching,
                })}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent size="sm">Refresh Workflows</TooltipContent>
        </Tooltip>
      </ContentPanelToolbar>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
            <PanelTable
              aria-label="Workflow runs"
              bodyHeadingHeight={0}
              columns={columns}
              items={items}
              isLoading={isLoading}
              numOfRows={Math.max(items.length, 6)}
              caption={
                <PanelTableQuickOpenCaption notice={filteredResultsCaption}>
                  <WorkflowQuickOpen
                    draft={openWorkflowDraft}
                    disabled={!service}
                    hasScope={hasVqueues}
                    onChange={setOpenWorkflowDraft}
                    onOpen={confirmOpenWorkflow}
                    service={service}
                  />
                </PanelTableQuickOpenCaption>
              }
              bodyDependencies={[service, searchString, isRunsFetching, error]}
              onRowAction={(rowId) => {
                const item = items.find(({ id }) => id === String(rowId));
                if (item) {
                  navigate(
                    workflowRunRouteHref(
                      baseUrl,
                      workflowIdentity(service, item),
                      searchParams,
                    ),
                  );
                }
              }}
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
                ) : !hasServices ? (
                  <EmptyState
                    icon={IconName.Workflow}
                    title="No Workflows registered"
                    description="Registered Workflow services will appear here."
                  />
                ) : (
                  <EmptyState
                    icon={hasFilters ? IconName.Search : IconName.Workflow}
                    title={
                      hasFilters
                        ? 'No runs match this filter'
                        : 'No Workflow runs found'
                    }
                    description={
                      hasFilters
                        ? 'Try adjusting the active filters.'
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
                const identity = workflowIdentity(service, item);
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
    </>
  );
}
