import { Invocation, useListInvocations } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { Column, Row, Table, TableBody, TableHeader } from '@restate/ui/table';
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
import { useEffect, useState } from 'react';
import { formatDurations } from '@restate/util/intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: 120,
  created_at: 100,
  invoked_by: 150,
  deployment: 220,
  journal_size: 90,
};

function Component() {
  const { selectedColumns, setSelectedColumns, sortedColumnsList } =
    useColumns();
  const { refetch, queryKey, dataUpdatedAt, error } = useListInvocations({
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: { rows: [], total_count: 0 },
    staleTime: Infinity,
  });
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

  return (
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
            Refresh
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
      <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
        <Table
          aria-label="Invocations"
          sortDescriptor={invocations.sortDescriptor}
          onSortChange={invocations.sort}
        >
          <TableHeader
            columns={sortedColumnsList.map((id, index) => ({
              name: COLUMN_NAMES[id],
              id,
              isRowHeader: index === 0,
            }))}
          >
            {(col) => (
              <Column
                id={col.id}
                isRowHeader={col.isRowHeader}
                allowsSorting
                defaultWidth={COLUMN_WIDTH[col.id]}
              >
                {col.name}
              </Column>
            )}
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
              </Row>
            )}
          </TableBody>
        </Table>
        <Footnote />
      </SnapshotTimeProvider>
    </div>
  );
}

function Footnote() {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { data, isFetching } = useListInvocations({
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

export const invocations = { Component };
