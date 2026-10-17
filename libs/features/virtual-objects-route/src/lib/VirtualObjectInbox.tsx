import type {
  components,
  FilterItem,
} from '@restate/data-access-admin-api-spec';
import { useBatchOperations } from '@restate/features-batch-operations';
import { Actions } from '@restate/features-invocation-route';
import {
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationTableCell,
  isInvocationTableColumnKey,
  isVqueueEntry,
  type InvocationTableColumnKey,
  VqueueEntryCell,
} from '@restate/features-invocation-ui';
import { useRestateContext } from '@restate/features-restate-context';
import type { VirtualObjectInstanceIdentity } from '@restate/features-virtual-object-instance';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import { ContentPanelToolbar } from '@restate/ui-content-panel';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { EmptyState } from '@restate/ui-empty-state';
import { Icon, IconName } from '@restate/ui-icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui-table';
import { SnapshotTimeProvider } from '@restate/util-snapshot-time';
import { formatNumber } from '@restate/util-intl';
import { getSearchParams } from '@restate/util-panel';
import { tv } from '@restate/util-styles';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

type InboxEntry = components['schemas']['VirtualObjectInboxEntry'];
type InboxResponse = components['schemas']['VirtualObjectInboxResponse'];
type InvocationsResponse =
  components['schemas']['VirtualObjectInvocationsResponse'];
type InboxColumnId = InvocationTableColumnKey | 'actions';

function getInboxInvocationFilters(
  identity: VirtualObjectInstanceIdentity,
): FilterItem[] {
  return [
    {
      field: 'target_service_ty',
      type: 'STRING',
      operation: 'EQUALS',
      value: 'virtual_object',
    },
    {
      field: 'target_service_name',
      type: 'STRING',
      operation: 'EQUALS',
      value: identity.service,
    },
    {
      field: 'target_service_key',
      type: 'STRING',
      operation: 'EQUALS',
      value: identity.key,
    },
    identity.scope === undefined
      ? {
          field: 'scope',
          type: 'NULL',
          operation: 'IS',
        }
      : {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: identity.scope,
        },
    {
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: ['scheduled', 'pending', 'ready', 'yielded', 'backing-off'],
    },
  ];
}

const inboxRowStyles = tv({
  base: 'bg-transparent [content-visibility:auto]',
  variants: {
    isClickable: {
      true: 'cursor-pointer',
      false: 'cursor-default',
    },
  },
});

const INBOX_COLUMNS = [
  {
    ...INVOCATION_TABLE_COLUMN_CONFIG.id,
    id: 'id',
    name: 'Entry',
    isRowHeader: true,
    minWidth: 250,
  },
  { ...INVOCATION_TABLE_COLUMN_CONFIG.created_at, id: 'created_at' },
  {
    ...INVOCATION_TABLE_COLUMN_CONFIG.target_handler_name,
    id: 'target_handler_name',
  },
  {
    ...INVOCATION_TABLE_COLUMN_CONFIG.limit_key,
    id: 'limit_key' as const,
  },
  { ...INVOCATION_TABLE_COLUMN_CONFIG.status, id: 'status' },
  {
    id: 'actions',
    name: 'Actions',
    width: 40,
    hideLabel: true,
  },
] satisfies PanelTableColumn<InboxColumnId>[];

function renderInboxCell(
  entry: InboxEntry,
  column: PanelTableColumn<InboxColumnId>,
) {
  if (column.id === 'actions') {
    return (
      <Cell className="align-top [&&&]:overflow-visible">
        {entry.kind === 'invocation' && (
          <Actions invocation={entry.invocation} />
        )}
      </Cell>
    );
  }
  if (entry.kind !== 'invocation') {
    return <VqueueEntryCell entry={entry} column={column.id} />;
  }
  if (isInvocationTableColumnKey(column.id)) {
    const invocation = entry.invocation;
    return (
      <InvocationTableCell
        column={column.id}
        row={
          invocation
            ? {
                ...invocation,
                vqueue_id: entry.vqueueId ?? invocation.vqueue_id,
              }
            : {
                id: entry.id,
                vqueue_id: entry.vqueueId,
                stage: entry.stage,
                status: entry.status ?? entry.stage,
                created_at: entry.createdAt,
              }
        }
        invocation={invocation}
      />
    );
  }
  return <Cell />;
}

function InboxBatchActions({
  inboxFilters,
  inboxCount,
}: {
  inboxFilters: FilterItem[];
  inboxCount?: number;
}) {
  const { batchCancel, batchKill } = useBatchOperations();
  const isDisabled = inboxCount === undefined || inboxCount === 0;
  const title =
    inboxCount === undefined
      ? 'Actions on the whole inbox'
      : `Actions on all ${formatNumber(inboxCount)} inbox ${inboxCount === 1 ? 'entry' : 'entries'}`;

  return (
    <ContentPanelToolbar>
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="secondary"
            disabled={isDisabled}
            className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
          >
            Actions
            {inboxCount !== undefined && inboxCount > 0 && (
              <Badge size="xs" variant="info">
                {formatNumber(inboxCount, true)}
              </Badge>
            )}
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-3.5 w-3.5 opacity-80"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownSection title={title}>
            <DropdownMenu
              onSelect={(action) => {
                if (action === 'cancel') {
                  batchCancel({ filters: inboxFilters });
                }
                if (action === 'kill') {
                  batchKill({ filters: inboxFilters });
                }
              }}
            >
              <DropdownItem value="cancel" destructive>
                <Icon
                  name={IconName.Cancel}
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                />
                Cancel…
              </DropdownItem>
              <DropdownItem value="kill" destructive>
                <Icon
                  name={IconName.Kill}
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                />
                Kill…
              </DropdownItem>
            </DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
    </ContentPanelToolbar>
  );
}

function InboxEntriesTable({
  ariaLabel,
  rows,
  isPending,
  error,
  truncated,
  limit,
  emptyTitle,
  emptyDescription,
  recent = false,
  batchActions = false,
  inboxFilters = [],
  inboxCount,
}: {
  ariaLabel: string;
  rows: InboxEntry[];
  isPending: boolean;
  error: Error | null;
  truncated?: boolean;
  limit?: number;
  emptyTitle: string;
  emptyDescription: string;
  recent?: boolean;
  batchActions?: boolean;
  inboxFilters?: FilterItem[];
  inboxCount?: number;
}) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {batchActions && (
        <InboxBatchActions
          inboxFilters={inboxFilters}
          inboxCount={inboxCount}
        />
      )}
      <PanelTable
        aria-label={ariaLabel}
        columns={INBOX_COLUMNS}
        items={rows}
        isLoading={isPending}
        error={error}
        numOfRows={6}
        bodyDependencies={[rows, error]}
        onRowAction={(rowId) => {
          const row = rows.find(({ id }) => id === String(rowId));
          if (row?.kind === 'invocation') {
            navigate(
              `${baseUrl}/invocations/${row.id}${getSearchParams(location.search)}`,
            );
          }
        }}
        rowClassName={(row) =>
          inboxRowStyles({
            isClickable: row.kind === 'invocation',
          })
        }
        emptyPlaceholder={
          <EmptyState
            icon={IconName.History}
            title={emptyTitle}
            description={emptyDescription}
          />
        }
        renderCell={renderInboxCell}
      />
      {truncated && (
        <div className="px-4 pt-3 text-xs text-zinc-500">
          {recent
            ? `Showing the ${limit} most recent invocations.`
            : `Showing ${limit} inbox entries.`}
        </div>
      )}
    </>
  );
}

export function VirtualObjectInbox({
  identity,
  data,
  dataUpdatedAt,
  error,
  isPending,
}: {
  identity: VirtualObjectInstanceIdentity;
  data?: InboxResponse;
  dataUpdatedAt?: number;
  error: Error | null;
  isPending: boolean;
}) {
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const inboxFilters = useMemo(
    () => getInboxInvocationFilters(identity),
    [identity],
  );
  const inboxCount =
    data?.inboxCount ?? (!data?.truncated ? rows.length : undefined);

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <InboxEntriesTable
        ariaLabel="Virtual Object inbox entries"
        rows={rows}
        isPending={isPending}
        error={error}
        truncated={data?.truncated}
        limit={data?.limit}
        emptyTitle="No inbox entries"
        emptyDescription="Queued invocations and state mutations will appear here."
        batchActions
        inboxFilters={inboxFilters}
        inboxCount={inboxCount}
      />
    </SnapshotTimeProvider>
  );
}

export function VirtualObjectInvocations({
  data,
  dataUpdatedAt,
  error,
  isPending,
}: {
  data?: InvocationsResponse;
  dataUpdatedAt?: number;
  error: Error | null;
  isPending: boolean;
}) {
  const rows = useMemo<InboxEntry[]>(
    () =>
      data?.rows.map((row) =>
        isVqueueEntry(row)
          ? row
          : { id: row.id, kind: 'invocation' as const, invocation: row },
      ) ?? [],
    [data?.rows],
  );

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <InboxEntriesTable
        ariaLabel="Recent Virtual Object invocations"
        rows={rows}
        isPending={isPending}
        error={error}
        truncated={data?.truncated}
        limit={data?.limit}
        emptyTitle="No recent invocations"
        emptyDescription="Invocations for this Virtual Object will appear here while they are retained."
        recent
      />
    </SnapshotTimeProvider>
  );
}
