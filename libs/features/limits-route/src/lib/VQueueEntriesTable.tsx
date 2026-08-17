import type {
  components,
  VqueueEntryStage,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { useListUserLimits } from '@restate/data-access/admin-api-hooks';
import { Actions } from '@restate/features/invocation-route';
import {
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationTableCell,
  InvocationTableDate,
  Status,
  type InvocationTableColumnKey,
} from '@restate/features/invocation-ui';
import { useRestateContext } from '@restate/features/restate-context';
import { VQueueHeadBlockedStatus } from '@restate/features/vqueue-ui';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { formatNumber } from '@restate/util/intl';
import { getSearchParams } from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getBlockedLimitCounterRequest } from './limits.counterFilters';

type VqueueEntry = components['schemas']['VirtualObjectInboxEntry'];
type VqueueEntriesResponse = components['schemas']['VqueueEntriesResponse'];
type VqueueEntryColumnId =
  | InvocationTableColumnKey
  | 'transitionedAt'
  | 'nextAt'
  | 'actions';

const TRANSITION_COLUMNS = {
  inbox: { name: 'Next transition', field: 'nextAt' },
  running: { name: 'Running since', field: 'transitionedAt' },
  suspended: { name: 'Suspended since', field: 'transitionedAt' },
  paused: { name: 'Paused since', field: 'transitionedAt' },
  finished: { name: 'Purges at', field: 'nextAt' },
} as const satisfies Record<
  VqueueEntryStage,
  {
    name: string;
    field: 'nextAt' | 'transitionedAt';
  }
>;

export function vqueueEntryTransitionColumn(stage: VqueueEntryStage) {
  return TRANSITION_COLUMNS[stage];
}

export function vqueueEntryTimeColumns(stage: VqueueEntryStage) {
  const transition = vqueueEntryTransitionColumn(stage);
  return stage === 'finished'
    ? ([{ name: 'Finished at', field: 'transitionedAt' }, transition] as const)
    : ([transition] as const);
}

const rowStyles = tv({
  base: 'cursor-default [content-visibility:auto]',
  variants: {
    isBlocked: {
      true: 'bg-amber-50/60',
      false: 'bg-transparent',
    },
  },
});

function stageLabel(stage: VqueueEntryStage) {
  return `${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
}

function getColumns(stage: VqueueEntryStage) {
  return [
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.id,
      id: 'id',
      name: 'Entry',
      isRowHeader: true,
      minWidth: 240,
    },
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.status,
      id: 'status',
    },
    ...vqueueEntryTimeColumns(stage).map(({ name, field }) => ({
      id: field,
      name,
      minWidth: 240,
    })),
    {
      id: 'actions',
      name: 'Actions',
      width: 40,
      hideLabel: true,
    },
  ] satisfies PanelTableColumn<VqueueEntryColumnId>[];
}

function entryRow(entry: VqueueEntry) {
  const invocation = entry.kind === 'invocation' ? entry.invocation : undefined;
  return invocation
    ? {
        ...invocation,
        vqueue_id: entry.vqueueId ?? invocation.vqueue_id,
        stage: entry.stage,
        status: entry.status,
        created_at: entry.createdAt ?? invocation.created_at,
      }
    : {
        id: entry.id,
        vqueue_id: entry.vqueueId,
        stage: entry.stage,
        status: entry.status ?? entry.stage,
        created_at: entry.createdAt,
      };
}

function NonInvocationEntry({ entry }: { entry: VqueueEntry }) {
  const isStateMutation = entry.kind === 'state-mutation';
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
        <Icon
          name={isStateMutation ? IconName.Database : IconName.History}
          className="h-full w-full p-1 text-zinc-500"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-zinc-700">
          {isStateMutation ? 'State mutation' : 'Other entry'}
        </span>
        <code className="block truncate text-2xs text-zinc-500">
          {entry.id}
        </code>
      </span>
    </span>
  );
}

export function isVqueueEntryNextTransitionBlocked(
  entry: Pick<VqueueEntry, 'id' | 'stage'>,
  snapshot?: VqueueSnapshot,
) {
  return Boolean(
    snapshot &&
    !snapshot.identity.isPaused &&
    entry.stage === 'inbox' &&
    entry.id === snapshot.head.entryId &&
    (snapshot.status.blocked || snapshot.status.scheduling === 'blocked'),
  );
}

export function hasBlockedVqueueHeadInRows(
  rows: readonly Pick<VqueueEntry, 'id' | 'stage'>[],
  snapshot?: VqueueSnapshot,
) {
  return rows.some((entry) =>
    isVqueueEntryNextTransitionBlocked(entry, snapshot),
  );
}

function BlockedNextTransition({ snapshot }: { snapshot: VqueueSnapshot }) {
  const [isOpen, setIsOpen] = useState(false);
  const request = useMemo(
    () =>
      snapshot.status.blockedResource
        ? getBlockedLimitCounterRequest(snapshot.status.blockedResource)
        : undefined,
    [snapshot.status.blockedResource],
  );
  const counter = useListUserLimits(request ?? { limit: 1 }, {
    enabled: isOpen && Boolean(request),
  });
  const limit = counter.data?.limits[0];

  return (
    <VQueueHeadBlockedStatus
      data={snapshot}
      showComparison={false}
      ruleLimit={limit?.concurrency_limit ?? undefined}
      counterUsage={limit?.usage ?? undefined}
      onOpenChange={setIsOpen}
    />
  );
}

function renderCell(
  entry: VqueueEntry,
  column: PanelTableColumn<VqueueEntryColumnId>,
  stage: VqueueEntryStage,
  snapshot?: VqueueSnapshot,
) {
  const invocation = entry.kind === 'invocation' ? entry.invocation : undefined;
  switch (column.id) {
    case 'id':
      return entry.kind === 'invocation' ? (
        <InvocationTableCell
          column="id"
          row={entryRow(entry)}
          invocation={invocation}
        />
      ) : (
        <Cell className="min-w-0 overflow-visible">
          <NonInvocationEntry entry={entry} />
        </Cell>
      );
    case 'status':
      if (stage === 'finished' && invocation) {
        return (
          <Cell className="align-top">
            <Status invocation={invocation} timeline={false} />
          </Cell>
        );
      }
      return (
        <InvocationTableCell
          column="status"
          row={entryRow(entry)}
          invocation={invocation}
        />
      );
    case 'transitionedAt':
    case 'nextAt': {
      const timeColumn = vqueueEntryTimeColumns(stage).find(
        ({ field }) => field === column.id,
      );
      return (
        <Cell className="min-w-0 [&&&]:overflow-visible">
          {column.id === 'nextAt' &&
          snapshot &&
          isVqueueEntryNextTransitionBlocked(entry, snapshot) ? (
            <BlockedNextTransition snapshot={snapshot} />
          ) : (
            <InvocationTableDate
              value={entry[column.id]}
              tooltipTitle={timeColumn?.name}
              pastPrefix={column.id === 'nextAt' ? 'Scheduled for ' : undefined}
            />
          )}
        </Cell>
      );
    }
    case 'actions':
      return (
        <Cell className="align-top [&&&]:overflow-visible">
          {entry.kind === 'invocation' && (
            <Actions invocation={entry.invocation} />
          )}
        </Cell>
      );
    default:
      return <Cell />;
  }
}

export function VQueueEntriesTable({
  stage,
  data,
  snapshot,
  error,
  isPending,
}: {
  stage: VqueueEntryStage;
  data?: VqueueEntriesResponse;
  snapshot?: VqueueSnapshot;
  error: Error | null;
  isPending: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const columns = useMemo(() => getColumns(stage), [stage]);
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const label = stageLabel(stage);

  return (
    <>
      <PanelTable
        aria-label={`${label} VQueue entries`}
        columns={columns}
        items={rows}
        isLoading={isPending}
        error={error}
        numOfRows={6}
        bodyKey={`${stage}:${isPending ? 'loading' : 'ready'}`}
        bodyDependencies={[rows, error, stage, snapshot]}
        onRowAction={(rowId) => {
          const row = rows.find(({ id }) => id === String(rowId));
          if (row?.kind === 'invocation') {
            navigate(
              `${baseUrl}/invocations/${row.id}${getSearchParams(location.search)}`,
            );
          }
        }}
        rowClassName={(entry) =>
          rowStyles({
            isBlocked: isVqueueEntryNextTransitionBlocked(entry, snapshot),
          })
        }
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Layers}
            iconClassName="rotate-90"
            title={`No ${stage} entries`}
            description={`Entries will appear here while they are in the ${label} stage.`}
          />
        }
        renderCell={(entry, column) =>
          renderCell(entry, column, stage, snapshot)
        }
      />
      {data?.truncated && (
        <div className="px-4 pt-3 text-xs text-zinc-500">
          Showing {formatNumber(data.limit)} {stage} entries.
        </div>
      )}
    </>
  );
}
