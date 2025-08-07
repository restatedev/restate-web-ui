import {
  FilterItem,
  getEndpoint,
  useListDeployments,
  useListInvocations,
  useListServices,
} from '@restate/data-access/admin-api';
import { Button, SubmitButton } from '@restate/ui/button';
import { Column, Row, Table, TableBody, TableHeader } from '@restate/ui/table';
import { useCollator } from 'react-aria';
import { SortDescriptor } from 'react-stately';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { COLUMN_NAMES, ColumnKey, useColumns } from './columns';
import { InvocationCell } from './cells';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { formatDurations } from '@restate/util/intl';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import {
  AddQueryTrigger,
  QueryBuilder,
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
  useQueryBuilder,
} from '@restate/ui/query-builder';
import { ClauseChip, FiltersTrigger } from './Filters';
import { Form, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTransition } from 'react';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: 80,
  created_at: 100,
  deployment: 220,
  journal_size: 135,
  pinned_service_protocol_version: 80,
};
const MIN_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  status: 150,
  target: 150,
  invoked_by: 100,
};
const MAX_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  invoked_by: 180,
};

const PAGE_SIZE = 30;
function Component() {
  const { promise: listDeploymentPromise, data: listDeploymentsData } =
    useListDeployments();
  const { promise: listServicesPromise } = useListServices(
    listDeploymentsData?.sortedServiceNames,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const schema = useMemo(() => {
    const serviceNamesPromise = listDeploymentPromise.then((results) =>
      [...(results?.sortedServiceNames ?? [])].sort(),
    );
    return [
      {
        id: 'id',
        label: 'Invocation Id',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'status',
        label: 'Status',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        options: [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'pending', label: 'Pending' },
          { value: 'ready', label: 'Ready' },
          { value: 'running', label: 'Running' },
          { value: 'backing-off', label: 'Backing-off' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'killed', label: 'Killed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'succeeded', label: 'Succeeded' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      {
        id: 'target_service_name',
        label: 'Service',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          serviceNamesPromise.then((results) => {
            return (
              results.map((name) => ({
                label: name,
                value: name,
              })) ?? []
            );
          }),
      },
      {
        id: 'target_service_key',
        label: 'Service key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'target_handler_name',
        label: 'Handler',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () => {
          return listServicesPromise.then(
            (services) =>
              Array.from(
                new Set(
                  services
                    .filter(Boolean)
                    .map((service) =>
                      (service!.handlers ?? []).map((handler) => handler.name),
                    )
                    .flat(),
                ).values(),
              )
                .sort()
                .map((name) => ({
                  label: name,
                  value: name,
                })) ?? [],
          );
        },
      },
      {
        id: 'target_service_ty',
        label: 'Service type',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        options: [
          { value: 'service', label: 'Service' },
          { value: 'virtual_object', label: 'Virtual Object' },
          { value: 'workflow', label: 'Workflow' },
        ],
      },
      {
        id: 'deployment',
        label: 'Deployment',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          listDeploymentPromise.then((results) =>
            Array.from(results?.deployments.values() ?? []).map(
              (deployment) => ({
                label: String(getEndpoint(deployment)),
                value: deployment.id,
                description: deployment.id,
              }),
            ),
          ),
      },
      {
        id: 'invoked_by',
        label: 'Invoked by',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
        options: [
          { value: 'service', label: 'Service' },
          { value: 'ingress', label: 'Ingress' },
        ],
      },
      {
        id: 'invoked_by_service_name',
        label: 'Invoked by service',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          serviceNamesPromise.then((results) =>
            results.map((name) => ({
              label: name,
              value: name,
            })),
          ),
      },
      {
        id: 'invoked_by_id',
        label: 'Invoked by id',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'idempotency_key',
        label: 'Idempotency key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },

      {
        id: 'retry_count',
        label: 'Attempt count',
        operations: [{ value: 'GREATER_THAN', label: '>' }],
        type: 'NUMBER',
      },
      {
        id: 'created_at',
        label: 'Created',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
      {
        id: 'scheduled_at',
        label: 'Scheduled',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
      {
        id: 'modified_at',
        label: 'Modified',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
    ] satisfies QueryClauseSchema<QueryClauseType>[];
  }, [listDeploymentPromise, listServicesPromise]);

  const { selectedColumns, setSelectedColumns, sortedColumnsList } =
    useColumns();
  const queryCLient = useQueryClient();
  const [queryFilters, setQueryFilters] = useState<FilterItem[]>(() =>
    schema
      .filter((schemaClause) => searchParams.get(`filter_${schemaClause.id}`))
      .map((schemaClause) => {
        return QueryClause.fromJSON(
          schemaClause,
          searchParams.get(`filter_${schemaClause.id}`)!,
        );
      })
      .filter((clause) => clause.isValid)
      .map((clause) => {
        return {
          field: clause.id,
          operation: clause.value.operation!,
          type: clause.type,
          value: clause.value.value,
        } as FilterItem;
      }),
  );
  const {
    dataUpdatedAt,
    errorUpdatedAt,
    error,
    data,
    isFetching,
    isPending,
    queryKey,
  } = useListInvocations(queryFilters, {
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 0,
  });

  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const collator = useCollator();
  const [pageIndex, _setPageIndex] = useState(0);
  const [, startTransition] = useTransition();

  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    [],
  );

  const sortedItems = useMemo(() => {
    return [...(data?.rows ?? [])].sort((a, b) => {
      let cmp = 0;
      if (sortDescriptor?.column === 'deployment') {
        cmp = collator.compare(
          (
            a.last_attempt_deployment_id ?? a.pinned_deployment_id
          )?.toString() ?? '',
          (
            b.last_attempt_deployment_id ?? b.pinned_deployment_id
          )?.toString() ?? '',
        );
      } else {
        cmp = collator.compare(
          a[
            sortDescriptor?.column as Exclude<
              ColumnKey,
              'deployment' | 'actions'
            >
          ]?.toString() ?? '',
          b[
            sortDescriptor?.column as Exclude<
              ColumnKey,
              'deployment' | 'actions'
            >
          ]?.toString() ?? '',
        );
      }

      // Flip the direction if descending order is specified.
      if (sortDescriptor?.direction === 'descending') {
        cmp *= -1;
      }

      return cmp;
    });
  }, [collator, data?.rows, sortDescriptor?.column, sortDescriptor?.direction]);

  const currentPageItems = useMemo(() => {
    return sortedItems.slice(
      pageIndex * PAGE_SIZE,
      (pageIndex + 1) * PAGE_SIZE,
    );
  }, [pageIndex, sortedItems]);

  useEffect(() => {
    if (sortedItems.length <= PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, setPageIndex, sortedItems.length]);

  const query = useQueryBuilder(
    schema
      .filter((schemaClause) => searchParams.get(`filter_${schemaClause.id}`))
      .map((schemaClause) => {
        return QueryClause.fromJSON(
          schemaClause,
          searchParams.get(`filter_${schemaClause.id}`)!,
        );
      }),
  );

  const totalSize = Math.ceil((data?.rows ?? []).length / PAGE_SIZE);
  const hash = 'hash' + currentPageItems.map(({ id }) => id).join('');

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div className="relative flex flex-auto flex-col gap-2">
        <Table
          aria-label="Invocations"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          key={hash}
        >
          <TableHeader>
            {sortedColumnsList.map((col) =>
              col.id !== 'actions' ? (
                <Column
                  id={col.id}
                  isRowHeader={col.isRowHeader}
                  allowsSorting
                  defaultWidth={COLUMN_WIDTH[col.id]}
                  minWidth={MIN_COLUMN_WIDTH[col.id] ?? 80}
                  maxWidth={MAX_COLUMN_WIDTH[col.id]}
                  key={col.id}
                >
                  {col.name}
                </Column>
              ) : (
                <Column id="actions" width={40} key={col.id}>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        variant="icon"
                        className="self-end rounded-lg p-0.5"
                      >
                        <Icon
                          name={IconName.TableProperties}
                          className="aspect-square h-4 w-4 text-gray-500"
                        />
                      </Button>
                    </DropdownTrigger>
                    <DropdownPopover>
                      <DropdownSection title="Columns">
                        <DropdownMenu
                          multiple
                          selectable
                          selectedItems={selectedColumns}
                          onSelect={setSelectedColumns}
                        >
                          {Object.entries(COLUMN_NAMES)
                            .filter(([key]) => key !== 'actions')
                            .map(([key, name]) => (
                              <DropdownItem key={key} value={key}>
                                {name}
                              </DropdownItem>
                            ))}
                        </DropdownMenu>
                      </DropdownSection>
                    </DropdownPopover>
                  </Dropdown>
                  <span className="sr-only">Actions</span>
                </Column>
              ),
            )}
          </TableHeader>
          <TableBody
            items={currentPageItems}
            dependencies={[selectedColumns, pageIndex]}
            error={error}
            isLoading={isPending}
            numOfColumns={sortedColumnsList.length}
            emptyPlaceholder={
              <div className="flex flex-col items-center gap-4 py-14">
                <div className="mr-1.5 h-12 w-12 shrink-0 rounded-xl bg-gray-200/50 p-1">
                  <Icon
                    name={IconName.Invocation}
                    className="h-full w-full p-1 text-zinc-400"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">
                  No invocations found
                </h3>
                <p className="max-w-md px-4 text-center text-code text-zinc-400">
                  Completed invocations (succeeded, failed, cancelled, or
                  killed) are retained only for workflows and those with
                  idempotency keys, and solely for the retention period
                  specified by the service.
                </p>
              </div>
            }
          >
            {(row) => (
              <Row
                id={row.id}
                columns={sortedColumnsList}
                className={`bg-transparent [content-visibility:auto] [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50`}
              >
                {({ id }) => {
                  return (
                    <InvocationCell
                      key={id}
                      column={id}
                      invocation={row}
                      isVisible
                    />
                  );
                }}
              </Row>
            )}
          </TableBody>
        </Table>
        <Footnote data={data} isFetching={isFetching} key={dataUpdate}>
          {!isPending && !error && totalSize > 1 && (
            <div className="flex items-center rounded-lg border bg-zinc-50 py-0.5 shadow-xs">
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}
              >
                <Icon name={IconName.ChevronFirst} className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((s) => s - 1)}
                className=""
              >
                <Icon name={IconName.ChevronLeft} className="h-4 w-4" />
              </Button>
              <div className="mx-2 flex items-center gap-0.5 text-code">
                {pageIndex + 1} / {totalSize}
              </div>

              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex((s) => s + 1)}
                className=""
              >
                <Icon name={IconName.ChevronRight} className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex(totalSize - 1)}
              >
                <Icon name={IconName.ChevronLast} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Footnote>
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action="/query/invocations"
          method="POST"
          className="relative flex"
          onSubmit={async (event) => {
            event.preventDefault();
            const newSearchParams = new URLSearchParams(searchParams);
            Array.from(newSearchParams.keys())
              .filter((key) => key.startsWith('filter_'))
              .forEach((key) => newSearchParams.delete(key));
            query.items
              .filter((clause) => clause.isValid)
              .forEach((item) => {
                newSearchParams.set(`filter_${item.id}`, String(item));
              });
            const sortedNewSearchParams = new URLSearchParams(newSearchParams);
            sortedNewSearchParams.sort();
            const sortedOldSearchParams = new URLSearchParams(searchParams);
            sortedOldSearchParams.sort();

            if (
              sortedOldSearchParams.toString() !==
              sortedNewSearchParams.toString()
            ) {
              setPageIndex(0);
            }
            setSearchParams(newSearchParams, { preventScrollReset: true });
            setQueryFilters(
              query.items
                .filter((clause) => clause.isValid)
                .map(
                  (clause) =>
                    ({
                      field: clause.id,
                      operation: clause.value.operation!,
                      type: clause.type,
                      value: clause.value.value,
                    }) as FilterItem,
                ),
            );
            await queryCLient.invalidateQueries({ queryKey });
          }}
        >
          <QueryBuilder query={query} schema={schema} multiple>
            <AddQueryTrigger
              MenuTrigger={FiltersTrigger}
              placeholder="Filter invocations…"
              title="Filters"
              className="w-full rounded-xl border-transparent pr-24 has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:min-w-[25ch] [&_input]:placeholder-zinc-400 [&_input+*]:right-24 [&_input::-webkit-search-cancel-button]:invert"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <SubmitButton
            isPending={isFetching}
            className="absolute top-1 right-1 bottom-1 rounded-lg py-0 disabled:bg-gray-400 disabled:text-gray-200"
          >
            Query
          </SubmitButton>
        </Form>
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

function Footnote({
  data,
  isFetching,
  children,
}: PropsWithChildren<{
  isFetching: boolean;
  data?: ReturnType<typeof useListInvocations>['data'];
}>) {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    setNow(Date.now());

    if (data) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 30_000);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [data]);

  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);

  return (
    <div className="flex w-full flex-row-reverse flex-wrap items-center text-center text-xs text-gray-500/80">
      {data && (
        <div className="ml-auto">
          {data.total_count ? (
            <>
              <span>{data.rows.length}</span>
              {' of '}
              <span className="font-medium text-gray-500">
                {data.total_count}
              </span>{' '}
              recently modified invocations
            </>
          ) : (
            'No invocations found'
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export const invocations = { Component };
