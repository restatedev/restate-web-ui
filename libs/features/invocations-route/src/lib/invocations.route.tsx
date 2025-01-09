import {
  getEndpoint,
  Invocation,
  useListDeployments,
  useListInvocations,
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
import { useAsyncList } from 'react-stately';
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
import { useQueryClient } from '@tanstack/react-query';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import { useEffect, useMemo, useState } from 'react';
import { formatDurations } from '@restate/util/intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { Actions } from '@restate/features/invocation-route';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import {
  AddQueryTrigger,
  QueryBuilder,
  QueryClauseSchema,
  QueryClauseType,
  useQueryBuilder,
} from '@restate/ui/query-builder';
import { ClauseChip, FiltersTrigger } from './Filters';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: 80,
  created_at: 100,
  invoked_by: 180,
  deployment: 220,
  journal_size: 135,
};

function Component() {
  const { selectedColumns, setSelectedColumns, sortedColumnsList } =
    useColumns();
  const { refetch, queryKey, dataUpdatedAt, error } = useListInvocations([], {
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: { rows: [], total_count: 0 },
    staleTime: Infinity,
  });
  const { promise: listDeploymentPromise } = useListDeployments();

  const queryCLient = useQueryClient();
  const collator = useCollator();
  const invocations = useAsyncList<Invocation>({
    async load() {
      await queryCLient.invalidateQueries({ queryKey });
      const results = await refetch();
      return { items: results.data?.rows ?? [] };
    },
    async sort({ items, sortDescriptor }) {
      // TODO
      return {
        items: items.sort((a, b) => {
          let cmp = 0;
          if (sortDescriptor.column === 'deployment') {
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
                sortDescriptor.column as Exclude<ColumnKey, 'deployment'>
              ]?.toString() ?? '',
              b[
                sortDescriptor.column as Exclude<ColumnKey, 'deployment'>
              ]?.toString() ?? ''
            );
          }

          // Flip the direction if descending order is specified.
          if (sortDescriptor.direction === 'descending') {
            cmp *= -1;
          }

          return cmp;
        }),
      };
    },
  });

  const query = useQueryBuilder();

  const schema = useMemo(() => {
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
        loadOptions: async () =>
          [
            'scheduled',
            'pending',
            'ready',
            'running',
            'suspending',
            'retrying',
            'killed',
            'cancelled',
            'succeeded',
            'failed',
          ].map((value) => ({ label: value, value })),
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
          listDeploymentPromise.then((results) => {
            return (
              results?.sortedServiceNames.map((name) => ({
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
        id: 'target_service_ty',
        label: 'Service type',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () => [
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
              })
            )
          ),
      },
      {
        id: 'invoked_by_service_name',
        label: 'Invoked by',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          listDeploymentPromise.then(
            (results) =>
              results?.sortedServiceNames.map((name) => ({
                label: name,
                value: name,
              })) ?? []
          ),
      },
      {
        id: 'idempotency_key',
        label: 'Idempotency key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'invoked_by_id',
        label: 'Invoked by id',
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
        id: 'last_start_at',
        label: 'Last started',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
    ] satisfies QueryClauseSchema<QueryClauseType>[];
  }, [listDeploymentPromise]);

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="flex flex-col flex-auto gap-2">
        <div className="flex self-end gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="icon"
                className="rounded-lg"
                onClick={() => invocations.reload()}
              >
                <Icon
                  name={IconName.Retry}
                  className="h-5 w-5 aspect-square text-gray-500"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent small offset={5}>
              <RefreshContentTooltip />
            </TooltipContent>
          </Tooltip>

          <Dropdown>
            <DropdownTrigger>
              <Button variant="icon" className="self-end rounded-lg">
                <Icon
                  name={IconName.TableProperties}
                  className="h-5 w-5 aspect-square text-gray-500"
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
        </div>
        <Table
          aria-label="Invocations"
          sortDescriptor={invocations.sortDescriptor}
          onSortChange={invocations.sort}
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
              <span className="sr-only">Actions</span>
            </Column>
          </TableHeader>
          <TableBody
            items={invocations.items}
            dependencies={[selectedColumns, invocations.isLoading, error]}
            error={error}
            isLoading={invocations.isLoading}
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
        <Footnote />
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <div className="flex relative">
          <QueryBuilder query={query} schema={schema}>
            <AddQueryTrigger
              MenuTrigger={FiltersTrigger}
              placeholder="Filter invocations…"
              title="Filters"
              className="rounded-xl has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:placeholder-zinc-400 border-transparent pr-20 [&_input+*]:left2-1 [&_input+*]:right-24 [&_input]:min-w-[10ch]"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <SubmitButton
            variant="primary"
            className="absolute right-1 top-1 bottom-1 rounded-lg py-0 self-end h-7"
          >
            Query
          </SubmitButton>
        </div>
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

function Footnote() {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { data, isFetching } = useListInvocations([], {
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: { rows: [], total_count: 0 },
    staleTime: Infinity,
  });

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

function RefreshContentTooltip() {
  const [now] = useState(() => Date.now());

  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);
  return (
    <div>
      <div className="font-medium text-center">Refresh</div>
      <div className="text-2xs text-center opacity-90">
        Last updated {duration} ago
      </div>
    </div>
  );
}

export const invocations = { Component };
