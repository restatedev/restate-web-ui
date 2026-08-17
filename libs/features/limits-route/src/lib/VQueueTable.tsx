import {
  useGetVirtualObjectLock,
  useListUserLimits,
  type VQueueMetaRow,
} from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  VirtualObjectInstanceTarget,
  virtualObjectInstanceHref,
  type VirtualObjectInstanceIdentity,
} from '@restate/features/virtual-object-instance';
import {
  DEFAULT_STYLE,
  InvocationsBreakdownTooltipContent,
  StackedStatusBar,
  STATUS_STYLE,
  type StatusBarEntry,
} from '@restate/features/status-chart';
import { ServiceTarget } from '@restate/features/service-target';
import { InvocationId, VQueueEntryId } from '@restate/features/invocation-ui';
import {
  BlockedStatus,
  blockedLimitCounterIdentity,
  getVqueueGateLabel,
  LimitKey,
  ReadyStatus,
  ScheduledStatus,
  Scope,
  VQueueId,
} from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { ChipGroup } from '@restate/ui/chip';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { DateTooltip } from '@restate/ui/tooltip';
import {
  formatCompactISODuration,
  formatDurations,
  formatNumber,
} from '@restate/util/intl';
import { panelHref } from '@restate/util/panel';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useMemo, useState, type ReactNode } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { useNavigate } from 'react-router';
import { getBlockedLimitCounterRequest } from './limits.counterFilters';
import {
  limitCountersForIdentityHref,
  limitCountersForRuleHref,
  type LimitCounterIdentity,
} from './navigation';

type VQueueColumn =
  | 'vqueue'
  | 'serviceLock'
  | 'scope'
  | 'head'
  | 'stages'
  | 'lastActivity';

type Activity = {
  label: string;
  title: string;
  value: string;
  timestamp: number;
};

interface VQueueRow extends VQueueMetaRow {
  latestActivity?: Activity;
}

type ChartTone = 'inbox' | 'running' | 'suspended' | 'paused';

const COLUMNS: PanelTableColumn<VQueueColumn>[] = [
  {
    id: 'vqueue',
    name: 'VQueue',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '1.25fr',
    minWidth: 0,
  },
  {
    id: 'serviceLock',
    name: 'Service / key',
    allowsSorting: true,
    defaultWidth: '3fr',
    minWidth: 0,
  },
  {
    id: 'scope',
    name: 'Scope / limit key',
    allowsSorting: true,
    defaultWidth: '3.5fr',
    minWidth: 0,
  },
  {
    id: 'head',
    name: 'Head entry',
    defaultWidth: '3fr',
    minWidth: 0,
  },
  {
    id: 'stages',
    name: 'Unfinished entries',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '2fr',
    minWidth: 0,
  },
  {
    id: 'lastActivity',
    name: 'Last activity',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: '2fr',
    minWidth: 0,
  },
];

const rowStyles = tv({
  base: 'cursor-default transition-none [content-visibility:auto]',
});

const headBlockedDetailsStyles = tv({
  slots: {
    root: 'max-w-80',
    details: 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs',
    term: 'text-zinc-400',
    value: 'min-w-0 text-right break-all text-zinc-700 tabular-nums',
  },
});

const metricCellStyles = tv({
  slots: {
    root: 'grid w-full min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2',
    bar: 'w-full max-w-40 min-w-0 justify-self-end',
    value: 'justify-self-start tabular-nums',
  },
});

const metricCell = metricCellStyles();

const STAGES = [
  { label: 'Inbox', key: 'num_inbox', tone: 'inbox' },
  { label: 'Running', key: 'num_running', tone: 'running' },
  { label: 'Suspended', key: 'num_suspended', tone: 'suspended' },
  { label: 'Paused', key: 'num_paused', tone: 'paused' },
] as const satisfies readonly {
  label: string;
  key: keyof VQueueMetaRow;
  tone: ChartTone;
}[];

const ACTIVITIES = [
  {
    label: 'entry enqueued',
    title: 'Last enqueued at',
    key: 'last_enqueued_at',
  },
  { label: 'entry started', title: 'Last started at', key: 'last_start_at' },
  {
    label: 'entry attempted',
    title: 'Last attempted at',
    key: 'last_attempt_at',
  },
  {
    label: 'entry finished',
    title: 'Last finished at',
    key: 'last_finish_at',
  },
] as const satisfies readonly {
  label: string;
  title: string;
  key: keyof VQueueMetaRow;
}[];

function QueueStatus({ row }: { row: VQueueMetaRow }) {
  if (row.queue_is_paused) {
    return (
      <Badge size="sm" variant="warning">
        Paused
      </Badge>
    );
  }
  return null;
}

function latestActivity(row: VQueueMetaRow): Activity | undefined {
  return ACTIVITIES.reduce<Activity | undefined>((latest, activity) => {
    const value = row[activity.key];
    if (typeof value !== 'string') return latest;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp < (latest?.timestamp ?? 0)) {
      return latest;
    }
    return { label: activity.label, title: activity.title, value, timestamp };
  }, undefined);
}

function lockIdentityFromName(lockName?: string | null) {
  const separator = lockName?.indexOf('/') ?? -1;
  if (!lockName || separator <= 0 || separator === lockName.length - 1) {
    return undefined;
  }
  return {
    service: lockName.slice(0, separator),
    key: lockName.slice(separator + 1),
  } satisfies VirtualObjectInstanceIdentity;
}

function lockIdentity(row: VQueueMetaRow) {
  return lockIdentityFromName(row.lock_name);
}

function chartVisual(tone: ChartTone) {
  return STATUS_STYLE[tone] ?? DEFAULT_STYLE;
}

function StageBars({ row }: { row: VQueueMetaRow }) {
  const statuses = STAGES.map(({ label, key, tone }) => {
    const value = Number(row[key]);
    return {
      name: tone,
      label,
      count: value,
      ...chartVisual(tone),
    } satisfies StatusBarEntry;
  });
  const total = statuses.reduce((sum, status) => sum + status.count, 0);
  if (total === 0) return null;
  const description = statuses
    .map((status) => `${status.label} ${formatNumber(status.count)}`)
    .join(', ');
  return (
    <div className={metricCell.root({ className: 'pr-3' })}>
      <Badge size="sm" className={metricCell.value()}>
        {formatNumber(total, true)}
      </Badge>
      <StackedStatusBar
        total={total}
        statuses={statuses.filter((status) => status.count > 0)}
        tooltipContent={
          <InvocationsBreakdownTooltipContent
            title={
              <div className="text-base! leading-7 font-medium text-gray-300!">
                Unfinished entries
              </div>
            }
            total={total}
            statuses={statuses}
            noun={{ one: 'entry', other: 'entries' }}
          />
        }
        className={metricCell.bar()}
        aria-label={`Unfinished entries: ${description}, total ${formatNumber(total)}`}
      />
    </div>
  );
}

type SchedulerState = NonNullable<VQueueMetaRow['scheduler']>;
type BlockedResource = NonNullable<SchedulerState['blockedResource']>;
type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];

function blockedObjectIdentity(resource: BlockedResource) {
  if (resource.resource !== 'lock') return undefined;
  const identity = lockIdentityFromName(resource.lockName);
  if (!identity) return undefined;
  return {
    ...identity,
    ...(resource.scope ? { scope: resource.scope } : {}),
  } satisfies VirtualObjectInstanceIdentity;
}

function LockHolderTarget({
  lockHolder,
}: {
  lockHolder: VirtualObjectLockHolder;
}) {
  if (lockHolder.kind === 'invocation') {
    return (
      <InvocationId
        id={lockHolder.id}
        size="md"
        truncateInMiddle
        popover={false}
        className="max-w-full"
      />
    );
  }
  return (
    <code className="block max-w-full truncate text-2xs text-zinc-600">
      {lockHolder.id}
    </code>
  );
}

function HeadBlockedDetails({
  scheduler,
  reason,
}: {
  scheduler: SchedulerState;
  reason: string;
}) {
  const details = [
    { label: 'Reason', value: reason },
    {
      label: 'Blocked for',
      value: scheduler.blockedDuration
        ? formatCompactISODuration(scheduler.blockedDuration)
        : undefined,
    },
    { label: 'Head entry', value: scheduler.headEntryId },
  ].filter(
    (detail): detail is { label: string; value: string } =>
      detail.value !== undefined,
  );
  const styles = headBlockedDetailsStyles();
  return (
    <div className={styles.root()}>
      {details.length > 0 && (
        <dl className={styles.details()}>
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className={styles.term()}>{detail.label}</dt>
              <dd className={styles.value()}>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function StructuredBlockedHeadState({
  scheduler,
  resource,
  baseUrl,
}: {
  scheduler: SchedulerState;
  resource: BlockedResource;
  baseUrl: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const objectIdentity = useMemo(
    () => blockedObjectIdentity(resource),
    [resource],
  );
  const counterIdentity = useMemo(
    () => blockedLimitCounterIdentity(resource),
    [resource],
  );
  const counterRequest = useMemo(
    () => getBlockedLimitCounterRequest(resource),
    [resource],
  );
  const lock = useGetVirtualObjectLock(
    objectIdentity?.service ?? '',
    objectIdentity?.key ?? '',
    objectIdentity?.scope,
    {
      enabled: isOpen && Boolean(objectIdentity),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );
  const counter = useListUserLimits(counterRequest ?? { limit: 1 }, {
    enabled: isOpen && Boolean(counterRequest),
  });
  const limit = counter.data?.limits[0];
  const lockHolder = lock.data?.lockHolder;

  return (
    <BlockedStatus
      resource={resource}
      blockedDuration={scheduler.blockedDuration}
      objectTarget={
        objectIdentity ? (
          <VirtualObjectInstanceTarget
            identity={objectIdentity}
            href={virtualObjectInstanceHref(baseUrl, objectIdentity)}
            containerClassName="w-full"
          />
        ) : undefined
      }
      lockHolderTarget={
        lockHolder ? <LockHolderTarget lockHolder={lockHolder} /> : undefined
      }
      counterHref={
        counterIdentity
          ? limitCountersForIdentityHref(
              baseUrl,
              counterIdentity,
              resource.blockedRule,
            )
          : undefined
      }
      ruleHref={
        resource.blockedRule
          ? limitCountersForRuleHref(baseUrl, resource.blockedRule)
          : undefined
      }
      ruleLimit={limit?.concurrency_limit ?? undefined}
      counterUsage={limit?.usage ?? undefined}
      onOpenChange={setIsOpen}
    />
  );
}

function HeadState({ row, baseUrl }: { row: VQueueMetaRow; baseUrl: string }) {
  const scheduler = row.scheduler;
  if (
    !scheduler ||
    scheduler.status === 'empty' ||
    scheduler.status === 'dormant'
  ) {
    return null;
  }

  if (scheduler.status === 'blocked') {
    if (scheduler.blockedResource) {
      return (
        <StructuredBlockedHeadState
          scheduler={scheduler}
          resource={scheduler.blockedResource}
          baseUrl={baseUrl}
        />
      );
    }
    const blockedResource = scheduler.blockedOn;
    const reason = blockedResource
      ? getVqueueGateLabel(blockedResource)
      : 'resource';
    return (
      <BlockedStatus
        reason={reason}
        details={<HeadBlockedDetails scheduler={scheduler} reason={reason} />}
      />
    );
  }
  if (scheduler.status === 'scheduled') {
    return <ScheduledStatus scheduledAt={scheduler.scheduledAt} />;
  }
  return <ReadyStatus />;
}

function HeadEntry({ row, baseUrl }: { row: VQueueMetaRow; baseUrl: string }) {
  const scheduler = row.scheduler;
  if (!scheduler) return null;
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      {scheduler.headEntryId && (
        <div className="w-[45%] min-w-0 shrink-0">
          <VQueueEntryId
            id={scheduler.headEntryId}
            size="md"
            className="max-w-full min-w-0"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <HeadState row={row} baseUrl={baseUrl} />
      </div>
    </div>
  );
}

function RelativeActivity({ activity }: { activity: Activity }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(activity.value));
  return (
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
      <DateTooltip
        date={new Date(activity.value)}
        title={activity.title}
        className="shrink-0"
      >
        <time
          dateTime={activity.value}
          className="font-medium text-zinc-600 tabular-nums"
        >
          {duration} ago
        </time>
      </DateTooltip>
      <span aria-hidden className="text-zinc-300">
        ·
      </span>
      <span className="min-w-0 truncate font-normal text-zinc-500/80">
        {activity.label}
      </span>
    </span>
  );
}

function renderCell(
  row: VQueueRow,
  column: PanelTableColumn<VQueueColumn>,
  baseUrl: string,
) {
  switch (column.id) {
    case 'vqueue':
      return (
        <Cell className="min-w-0 overflow-hidden">
          <span className="flex min-w-0 items-center gap-2 overflow-hidden">
            <VQueueId
              id={row.id}
              popover={false}
              truncateInMiddle
              className="max-w-full min-w-0 shrink overflow-hidden"
            />
            <QueueStatus row={row} />
          </span>
        </Cell>
      );
    case 'serviceLock': {
      const identity = lockIdentity(row);
      return (
        <Cell className="min-w-0 overflow-hidden">
          {identity ? (
            <VirtualObjectInstanceTarget
              identity={identity}
              serviceHref={panelHref({ service: identity.service })}
              href={virtualObjectInstanceHref(baseUrl, {
                ...identity,
                ...(row.scope ? { scope: row.scope } : {}),
              })}
              containerClassName="w-full min-w-0 overflow-hidden"
            />
          ) : row.service_name ? (
            <ServiceTarget
              service={row.service_name}
              links={{
                service: {
                  href: panelHref({ service: row.service_name }),
                  ariaLabel: `Open service ${row.service_name}`,
                },
              }}
              className="w-full"
            />
          ) : (
            <span className="text-zinc-300">Unknown</span>
          )}
        </Cell>
      );
    }
    case 'scope':
      return (
        <Cell className="min-w-0 overflow-hidden">
          {row.scope || row.limit_key ? (
            <ChipGroup density="compact" className="min-w-0">
              <Scope
                value={row.scope ?? undefined}
                relationship={row.limit_key ? 'target' : undefined}
                labelVariant="compact"
              />
              <LimitKey
                value={row.limit_key ?? undefined}
                relationship={row.scope ? 'scope' : undefined}
                showCopy={false}
              />
            </ChipGroup>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </Cell>
      );
    case 'head':
      return (
        <Cell className="min-w-0 overflow-hidden">
          <HeadEntry row={row} baseUrl={baseUrl} />
        </Cell>
      );
    case 'stages':
      return (
        <Cell>
          <StageBars row={row} />
        </Cell>
      );
    case 'lastActivity':
      return (
        <Cell>
          {row.latestActivity ? (
            <RelativeActivity activity={row.latestActivity} />
          ) : (
            <span className="text-zinc-300">Never</span>
          )}
        </Cell>
      );
  }
}

export function VQueueTable({
  baseUrl,
  vqueues,
  isLoading,
  error,
  emptyPlaceholder,
  dependencies,
  sortDescriptor,
  onSortChange,
}: {
  baseUrl: string;
  vqueues: VQueueMetaRow[];
  isLoading?: boolean;
  error?: Error | null;
  emptyPlaceholder?: ReactNode;
  dependencies?: unknown[];
  sortDescriptor?: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor | undefined) => void;
}) {
  const navigate = useNavigate();
  const rows = useMemo(
    () =>
      vqueues.map((row) => ({
        ...row,
        latestActivity: latestActivity(row),
      })),
    [vqueues],
  );
  const bodyKey = `${isLoading ? 'loading' : 'ready'}:${rows
    .map((row) => row.id)
    .join(':')}`;

  return (
    <PanelTable
      aria-label="VQueues"
      bodyKey={bodyKey}
      columns={COLUMNS}
      items={rows}
      isLoading={isLoading}
      error={error}
      numOfRows={Math.max(rows.length, 6)}
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      bodyDependencies={[...(dependencies ?? []), error]}
      onRowAction={(rowId) => {
        navigate(`${baseUrl}/flow-control/vqueues/${String(rowId)}`);
      }}
      rowClassName={rowStyles()}
      emptyPlaceholder={emptyPlaceholder}
      renderCell={(row, column) => renderCell(row, column, baseUrl)}
    />
  );
}
