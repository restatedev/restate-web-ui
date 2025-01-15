import {
  FilterItem,
  getEndpoint,
  useListDeployments,
  useListInvocations,
  useListServices,
} from '@restate/data-access/admin-api';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from '@restate/ui/table';
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
import { useEffect, useMemo, useState } from 'react';
import { formatDurations } from '@restate/util/intl';
import { Actions } from '@restate/features/invocation-route';
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
import {
  ClientLoaderFunctionArgs,
  Form,
  redirect,
  useSearchParams,
} from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: 80,
  created_at: 100,
  invoked_by: 180,
  deployment: 220,
  journal_size: 135,
};

function Component() {
  const { promise: listDeploymentPromise, data: listDeploymentsData } =
    useListDeployments();
  const { promise: listServicesPromise } = useListServices(
    listDeploymentsData?.sortedServiceNames
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const schema = useMemo(() => {
    const serviceNamesPromise = listDeploymentPromise.then((results) =>
      [...(results?.sortedServiceNames ?? [])].sort()
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
          { value: 'suspended', label: 'Suspended' },
          { value: 'retrying', label: 'Retrying' },
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
                      service!.handlers.map((handler) => handler.name)
                    )
                    .flat()
                ).values()
              )
                .sort()
                .map((name) => ({
                  label: name,
                  value: name,
                })) ?? []
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
        id: 'last_attempt_deployment_id',
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
              })
            )
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
            }))
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
          searchParams.get(`filter_${schemaClause.id}`)!
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
      })
  );
  const { dataUpdatedAt, error, data, isFetching, isPending, queryKey } =
    useListInvocations(queryFilters, {
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 0,
    });
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const collator = useCollator();

  const sortedItems = useMemo(() => {
    return (
      data?.rows.sort((a, b) => {
        let cmp = 0;
        if (sortDescriptor?.column === 'deployment') {
          cmp = collator.compare(
            (
              a.last_attempt_deployment_id ?? a.pinned_deployment_id
            )?.toString() ?? '',
            (
              b.last_attempt_deployment_id ?? b.pinned_deployment_id
            )?.toString() ?? ''
          );
        } else {
          cmp = collator.compare(
            a[
              sortDescriptor?.column as Exclude<ColumnKey, 'deployment'>
            ]?.toString() ?? '',
            b[
              sortDescriptor?.column as Exclude<ColumnKey, 'deployment'>
            ]?.toString() ?? ''
          );
        }

        // Flip the direction if descending order is specified.
        if (sortDescriptor?.direction === 'descending') {
          cmp *= -1;
        }

        return cmp;
      }) ?? []
    );
  }, [collator, data?.rows, sortDescriptor?.column, sortDescriptor?.direction]);

  const query = useQueryBuilder(
    schema
      .filter((schemaClause) => searchParams.get(`filter_${schemaClause.id}`))
      .map((schemaClause) => {
        return QueryClause.fromJSON(
          schemaClause,
          searchParams.get(`filter_${schemaClause.id}`)!
        );
      })
  );

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="flex flex-col flex-auto gap-2">
        <Table
          aria-label="Invocations"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <TableHeader>
            {sortedColumnsList
              .map((id, index) => ({
                name: COLUMN_NAMES[id],
                id,
                isRowHeader: index === 0,
              }))
              .map((col) => (
                <Column
                  id={col.id}
                  isRowHeader={col.isRowHeader}
                  allowsSorting
                  defaultWidth={COLUMN_WIDTH[col.id]}
                  key={col.id}
                >
                  {col.name}
                </Column>
              ))}
            <Column id="actions" width={40}>
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="icon" className="self-end rounded-lg p-0.5">
                    <Icon
                      name={IconName.TableProperties}
                      className="h-4 w-4 aspect-square text-gray-500"
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
                      {Object.entries(COLUMN_NAMES).map(([key, name]) => (
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
          </TableHeader>
          <TableBody
            items={sortedItems}
            dependencies={[selectedColumns]}
            error={error}
            isLoading={isPending}
            numOfColumns={sortedColumnsList.length}
            emptyPlaceholder={
              <div className="flex flex-col items-center py-14 gap-4">
                <div className="mr-1.5 shrink-0 h-12 w-12 p-1 bg-gray-200/50  rounded-xl">
                  <Icon
                    name={IconName.Invocation}
                    className="w-full h-full text-zinc-400 p-1"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">
                  No invocations found
                </h3>
              </div>
            }
          >
            {(row) => (
              <Row className="[&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50 bg-transparent aaa">
                {sortedColumnsList.map((col) => (
                  <InvocationCell key={col} column={col} invocation={row} />
                ))}
                <Cell className="align-top">
                  <Actions invocation={row} />
                </Cell>
              </Row>
            )}
          </TableBody>
        </Table>
        <Footnote data={data} isFetching={isFetching} />
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action="/query/invocations"
          method="POST"
          className="flex relative"
          onSubmit={async (event) => {
            event.preventDefault();
            setSearchParams((old) => {
              const newSearchParams = new URLSearchParams(old);
              Array.from(newSearchParams.keys())
                .filter((key) => key.startsWith('filter_'))
                .forEach((key) => newSearchParams.delete(key));
              query.items
                .filter((clause) => clause.isValid)
                .forEach((item) => {
                  newSearchParams.set(`filter_${item.id}`, String(item));
                });
              return newSearchParams;
            });
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
                    } as FilterItem)
                )
            );
            await queryCLient.invalidateQueries({ queryKey });
          }}
        >
          <QueryBuilder query={query} schema={schema}>
            <AddQueryTrigger
              MenuTrigger={FiltersTrigger}
              placeholder="Filter invocations…"
              title="Filters"
              className="rounded-xl [&_input::-webkit-search-cancel-button]:invert has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:placeholder-zinc-400 border-transparent pr-24 w-full  [&_input+*]:right-24 [&_input]:min-w-[10ch]"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <SubmitButton
            isPending={isFetching}
            className="absolute right-1 top-1 bottom-1 rounded-lg py-0"
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
}: {
  isFetching: boolean;
  data?: ReturnType<typeof useListInvocations>['data'];
}) {
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

  if (!data || isFetching) {
    return null;
  }
  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);
  return (
    <div className="w-full text-center text-xs text-gray-500/80">
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
      as of <span className="font-medium text-gray-500">{duration} ago</span>
    </div>
  );
}

export const clientLoader = ({ request }: ClientLoaderFunctionArgs) => {
  const url = new URL(request.url);
  const hasFilters = Array.from(url.searchParams.keys()).some((key) =>
    key.startsWith('filter_')
  );
  if (!hasFilters) {
    url.searchParams.append(
      'filter_status',
      JSON.stringify({
        operation: 'NOT_IN',
        value: ['succeeded', 'cancelled', 'killed'],
      })
    );
    return redirect(url.search);
  }
};

export const invocations = { Component, clientLoader };
