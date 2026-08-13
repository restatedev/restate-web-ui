import type { VQueueMetaRow } from '@restate/data-access/admin-api-hooks';
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
import { VQueueEntryId } from '@restate/features/invocation-ui';
import {
  getVqueueGateLabel,
  LimitKey,
  Scope,
  VQueueId,
} from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { ChipGroup } from '@restate/ui/chip';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { DateTooltip, HoverTooltip } from '@restate/ui/tooltip';
import {
  formatCompactISODuration,
  formatDurations,
  formatNumber,
} from '@restate/util/intl';
import { panelHref } from '@restate/util/panel';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useMemo, type ReactNode } from 'react';
import type { SortDescriptor } from 'react-aria-components';

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
    name: 'Service / lock',
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
    name: 'Workload',
    allowsSorting: true,
    defaultWidth: '2fr',
    minWidth: 0,
  },
  {
    id: 'lastActivity',
    name: 'Last activity',
    allowsSorting: true,
    defaultWidth: '2fr',
    minWidth: 0,
  },
];

const rowStyles = tv({
  base: 'cursor-default transition-none [content-visibility:auto]',
});

const headStateStyles = tv({
  slots: {
    root: 'flex min-w-0 items-center gap-1.5 text-xs',
    dot: 'h-1.5 w-1.5 shrink-0 rounded-full',
    status: 'shrink-0 font-medium',
    separator: 'text-zinc-300',
    detail: 'min-w-0 truncate text-zinc-400 tabular-nums',
  },
  variants: {
    tone: {
      blocked: {
        dot: 'bg-orange-500',
        status: 'text-orange-700',
      },
      scheduled: {
        dot: 'bg-zinc-400',
        status: 'text-zinc-600',
      },
      ready: {
        dot: 'bg-blue-500',
        status: 'text-blue-700',
      },
    },
  },
});

const metricCellStyles = tv({
  slots: {
    root: 'grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2',
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

function lockIdentity(row: VQueueMetaRow) {
  const separator = row.lock_name?.indexOf('/') ?? -1;
  if (
    !row.lock_name ||
    separator <= 0 ||
    separator === row.lock_name.length - 1
  ) {
    return undefined;
  }
  return {
    service: row.lock_name.slice(0, separator),
    key: row.lock_name.slice(separator + 1),
  } satisfies VirtualObjectInstanceIdentity;
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
                Workload
              </div>
            }
            total={total}
            statuses={statuses}
            noun={{ one: 'entry', other: 'entries' }}
          />
        }
        className={metricCell.bar()}
        aria-label={`Workload: ${description}, total ${formatNumber(total)}`}
      />
    </div>
  );
}

type SchedulerState = NonNullable<VQueueMetaRow['scheduler']>;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? dateTimeFormatter.format(date)
    : value;
}

function HeadStateTooltip({
  scheduler,
  reason,
}: {
  scheduler: SchedulerState;
  reason?: string;
}) {
  const resource = scheduler.blockedResource;
  const details = [
    { label: 'Reason', value: reason },
    {
      label: 'Blocked for',
      value: scheduler.blockedDuration
        ? formatCompactISODuration(scheduler.blockedDuration)
        : undefined,
    },
    { label: 'Rule', value: resource?.blockedRule },
    { label: 'Scope', value: resource?.scope },
    { label: 'Limit key', value: resource?.limitKey },
    { label: 'Lock', value: resource?.lockName },
    {
      label: 'Retry at',
      value: resource?.estimatedRetryAt
        ? formatDateTime(resource.estimatedRetryAt)
        : undefined,
    },
    {
      label: 'Run at',
      value: scheduler.scheduledAt
        ? formatDateTime(scheduler.scheduledAt)
        : undefined,
    },
    { label: 'Head entry', value: scheduler.headEntryId },
  ].filter(
    (detail): detail is { label: string; value: string } =>
      detail.value !== undefined,
  );
  const title = {
    blocked: 'Head entry blocked',
    scheduled: 'Head entry scheduled',
    ready: 'Head entry ready',
    dormant: 'Queue dormant',
    empty: 'Queue empty',
  }[scheduler.status];
  return (
    <div className="max-w-80 min-w-56">
      <div className="text-sm font-medium text-gray-100">{title}</div>
      {details.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-gray-400">{detail.label}</dt>
              <dd className="min-w-0 text-right break-all text-gray-200 tabular-nums">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function HeadState({ row }: { row: VQueueMetaRow }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const scheduler = row.scheduler;
  if (
    !scheduler ||
    scheduler.status === 'empty' ||
    scheduler.status === 'dormant'
  ) {
    return null;
  }

  const blockedResource =
    scheduler.blockedResource?.resource ?? scheduler.blockedOn;
  const reason =
    scheduler.status === 'blocked'
      ? blockedResource
        ? getVqueueGateLabel(blockedResource)
        : 'resource'
      : undefined;
  const scheduledTiming = scheduler.scheduledAt
    ? durationSinceLastSnapshot(scheduler.scheduledAt)
    : undefined;
  const scheduledLabel = scheduledTiming
    ? scheduledTiming.isPast
      ? 'due now'
      : `in ${formatDurations(scheduledTiming)}`
    : undefined;
  const presentation =
    scheduler.status === 'blocked'
      ? {
          tone: 'blocked' as const,
          status: 'Blocked',
          detail: reason,
        }
      : scheduler.status === 'scheduled'
        ? {
            tone: 'scheduled' as const,
            status: 'Scheduled',
            detail: scheduledLabel,
          }
        : { tone: 'ready' as const, status: 'Ready', detail: undefined };
  const ariaLabel = [presentation.status, presentation.detail]
    .filter(Boolean)
    .join(', ');
  const styles = headStateStyles({ tone: presentation.tone });

  return (
    <HoverTooltip
      size="default"
      className="min-w-0 flex-1"
      content={<HeadStateTooltip scheduler={scheduler} reason={reason} />}
    >
      <span className={styles.root()} aria-label={`Head entry: ${ariaLabel}`}>
        <span aria-hidden className={styles.dot()} />
        <span className={styles.status()}>{presentation.status}</span>
        {presentation.detail && (
          <>
            <span aria-hidden className={styles.separator()}>
              ·
            </span>
            <span className={styles.detail()}>{presentation.detail}</span>
          </>
        )}
      </span>
    </HoverTooltip>
  );
}

function HeadEntry({ row }: { row: VQueueMetaRow }) {
  const scheduler = row.scheduler;
  if (!scheduler) return null;
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      {scheduler.headEntryId && (
        <div className="min-w-0 flex-1">
          <VQueueEntryId
            id={scheduler.headEntryId}
            size="md"
            className="max-w-full min-w-0"
          />
        </div>
      )}
      <HeadState row={row} />
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
          <HeadEntry row={row} />
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
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
}) {
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
      rowClassName={rowStyles()}
      emptyPlaceholder={emptyPlaceholder}
      renderCell={(row, column) => renderCell(row, column, baseUrl)}
    />
  );
}
