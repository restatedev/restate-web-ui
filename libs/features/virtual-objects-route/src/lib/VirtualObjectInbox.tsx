import { useFeatures } from '@restate/data-access/admin-api';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  Duration,
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationId,
  InvocationTableCell,
  isInvocationTableColumnKey,
  Status,
  type InvocationTableColumnKey,
} from '@restate/features/invocation-ui';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { getSearchParams } from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

type InboxEntry = components['schemas']['VirtualObjectInboxEntry'];
type InboxResponse = components['schemas']['VirtualObjectInboxResponse'];
type InboxTableRow = InboxEntry & {
  isLockHolder?: boolean;
  acquiredAt?: string;
};
type InboxColumnId = InvocationTableColumnKey;
export type VirtualObjectInboxMode = 'exclusive' | 'shared';
type LockRowTone = 'success' | 'danger' | 'info' | 'warning' | 'default';

const inboxRowStyles = tv({
  base: "bg-transparent [content-visibility:auto] [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50",
  variants: {
    lockTone: {
      success: 'bg-green-50/80 hover:bg-green-100/70 [&>td]:border-b-green-200',
      danger: 'bg-red-50/80 hover:bg-red-100/70 [&>td]:border-b-red-200',
      info: 'bg-blue-50/80 hover:bg-blue-100/70 [&>td]:border-b-blue-200',
      warning:
        'bg-orange-50/80 hover:bg-orange-100/70 [&>td]:border-b-orange-200',
      default: 'bg-zinc-50/90 hover:bg-zinc-100/80 [&>td]:border-b-zinc-300',
    },
    isClickable: {
      true: 'cursor-pointer',
      false: 'cursor-default',
    },
  },
});

function getLockRowTone(row: InboxTableRow): LockRowTone | undefined {
  if (!row.isLockHolder) return undefined;
  if (row.invocation?.isRetrying) return 'warning';

  const status = row.invocation?.status ?? row.status ?? row.stage;
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
    case 'started':
      return 'info';
    case 'pending':
    case 'paused':
    case 'backing-off':
      return 'warning';
    default:
      return 'default';
  }
}

function getInboxColumns(showVqueueColumns: boolean) {
  return [
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.id,
      id: 'id',
      name: 'Entry',
      isRowHeader: true,
      minWidth: 250,
    },
    ...(showVqueueColumns
      ? [
          {
            ...INVOCATION_TABLE_COLUMN_CONFIG.vqueue_id,
            id: 'vqueue_id' as const,
          },
        ]
      : []),
    { ...INVOCATION_TABLE_COLUMN_CONFIG.created_at, id: 'created_at' },
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.target_handler_name,
      id: 'target_handler_name',
    },
    ...(showVqueueColumns
      ? [
          {
            ...INVOCATION_TABLE_COLUMN_CONFIG.limit_key,
            id: 'limit_key' as const,
          },
        ]
      : []),
    { ...INVOCATION_TABLE_COLUMN_CONFIG.status, id: 'status' },
  ] satisfies PanelTableColumn<InboxColumnId>[];
}

function NonInvocationIdentity({
  entry,
  iconName,
}: {
  entry: InboxEntry;
  iconName?: IconName;
}) {
  const isStateMutation = entry.kind === 'state-mutation';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
        <Icon
          name={
            iconName ?? (isStateMutation ? IconName.Database : IconName.History)
          }
          className="h-full w-full p-1 text-zinc-500"
        />
      </div>
      <div className="flex min-w-0 items-baseline gap-2">
        {!isStateMutation && (
          <span className="shrink-0 text-sm font-medium text-zinc-700">
            Other entry
          </span>
        )}
        <code className="truncate text-xs text-zinc-600">{entry.id}</code>
      </div>
    </div>
  );
}

function LockHolderIdentity({ entry }: { entry: InboxTableRow }) {
  return (
    <div className="min-w-0">
      <span className="sr-only">Lock holder: </span>
      {entry.kind === 'invocation' ? (
        <InvocationId
          id={entry.id}
          iconName={IconName.Security}
          truncateInMiddle
          popover={false}
          className="mr-1 w-fit max-w-full min-w-0 rounded-md [--pulse-size:2px]"
        />
      ) : (
        <NonInvocationIdentity entry={entry} iconName={IconName.Security} />
      )}
    </div>
  );
}

function LockHolderStatus({ entry }: { entry: InboxTableRow }) {
  const status = entry.status ?? entry.stage;
  const fallbackLabel = status
    ? status
        .replaceAll('-', ' ')
        .replace(/^./, (character) => character.toUpperCase())
    : undefined;

  return (
    <div className="flex flex-row flex-wrap items-baseline gap-2">
      {entry.invocation ? (
        <Status invocation={entry.invocation} />
      ) : fallbackLabel ? (
        <Badge>{fallbackLabel}</Badge>
      ) : null}
      {entry.acquiredAt && (
        <Duration
          prefix="Lock held for"
          date={entry.acquiredAt}
          tooltipTitle="Lock acquired at"
          className="shrink-0"
        />
      )}
    </div>
  );
}

function renderInboxCell(
  entry: InboxTableRow,
  column: PanelTableColumn<InboxColumnId>,
) {
  if (column.id === 'id' && entry.isLockHolder) {
    return (
      <Cell className="overflow-visible align-top">
        <LockHolderIdentity entry={entry} />
      </Cell>
    );
  }
  if (column.id === 'status' && entry.isLockHolder && entry.acquiredAt) {
    return (
      <Cell className="align-top">
        <LockHolderStatus entry={entry} />
      </Cell>
    );
  }
  if (column.id === 'id' && entry.kind !== 'invocation') {
    return (
      <Cell className="overflow-visible">
        <NonInvocationIdentity entry={entry} />
      </Cell>
    );
  }
  if (isInvocationTableColumnKey(column.id)) {
    const invocation =
      entry.kind === 'invocation' ? entry.invocation : undefined;
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

function InboxEntriesTable({
  ariaLabel,
  columns,
  rows,
  isPending,
  error,
  truncated,
  limit,
  emptyTitle,
  emptyDescription,
  recent = false,
}: {
  ariaLabel: string;
  columns: PanelTableColumn<InboxColumnId>[];
  rows: InboxTableRow[];
  isPending: boolean;
  error: Error | null;
  truncated?: boolean;
  limit?: number;
  emptyTitle: string;
  emptyDescription: string;
  recent?: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <PanelTable
        aria-label={ariaLabel}
        columns={columns}
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
            lockTone: getLockRowTone(row),
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
            ? `Showing the ${limit} most recent entries.`
            : `Showing ${limit} inbox entries.`}
        </div>
      )}
    </>
  );
}

function InboxTable({
  ariaLabel,
  mode,
  data,
  dataUpdatedAt,
  error,
  isPending,
}: {
  ariaLabel: string;
  mode: VirtualObjectInboxMode;
  data?: InboxResponse;
  dataUpdatedAt?: number;
  error: Error | null;
  isPending: boolean;
}) {
  const features = useFeatures();
  const hasVqueues = features.has('vqueues');
  const columns = useMemo(() => getInboxColumns(hasVqueues), [hasVqueues]);
  const rows = useMemo<InboxTableRow[]>(() => {
    const inboxRows = data?.rows ?? [];
    const lockHolder =
      mode === 'exclusive' ? data?.lock?.lockHolder : undefined;
    return lockHolder
      ? [
          { ...lockHolder, isLockHolder: true },
          ...inboxRows.filter((entry) => entry.id !== lockHolder.id),
        ]
      : inboxRows;
  }, [data?.lock?.lockHolder, data?.rows, mode]);

  if (!isPending && data?.supported === false) {
    return (
      <div className="px-5 py-12">
        <EmptyState
          icon={IconName.History}
          title={
            mode === 'exclusive'
              ? 'Lock and inbox unavailable'
              : 'Shared invocations unavailable'
          }
          description="This view is not available with this Restate version."
        />
      </div>
    );
  }

  const isShared = mode === 'shared';
  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <InboxEntriesTable
        ariaLabel={ariaLabel}
        columns={columns}
        rows={rows}
        isPending={isPending}
        error={error}
        truncated={data?.truncated}
        limit={data?.limit}
        emptyTitle={
          isShared ? 'No recent shared invocations' : 'No lock or inbox entries'
        }
        emptyDescription={
          isShared
            ? 'Shared invocations will appear here.'
            : 'Lock holders, invocations, and state mutations will appear here.'
        }
        recent={isShared}
      />
    </SnapshotTimeProvider>
  );
}

export function VirtualObjectInbox({
  mode,
  data,
  dataUpdatedAt,
  error,
  isPending,
}: {
  mode: VirtualObjectInboxMode;
  data?: InboxResponse;
  dataUpdatedAt?: number;
  error: Error | null;
  isPending: boolean;
}) {
  return mode === 'shared' ? (
    <InboxTable
      ariaLabel="Recent shared invocations"
      mode="shared"
      data={data}
      dataUpdatedAt={dataUpdatedAt}
      error={error}
      isPending={isPending}
    />
  ) : (
    <InboxTable
      ariaLabel="Lock and inbox entries"
      mode="exclusive"
      data={data}
      dataUpdatedAt={dataUpdatedAt}
      error={error}
      isPending={isPending}
    />
  );
}
