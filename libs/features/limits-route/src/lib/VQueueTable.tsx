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
import { LimitKey, Scope, VQueueId } from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { ChipGroup } from '@restate/ui/chip';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations, formatNumber } from '@restate/util/intl';
import { panelHref } from '@restate/util/panel';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useMemo, type ReactNode } from 'react';
import type { SortDescriptor } from 'react-aria-components';

type VQueueColumn =
  | 'vqueue'
  | 'service'
  | 'scope'
  | 'virtualObject'
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
    defaultWidth: '2.5fr',
    minWidth: 190,
  },
  {
    id: 'service',
    name: 'Service',
    allowsSorting: true,
    defaultWidth: '2fr',
    minWidth: 125,
  },
  {
    id: 'scope',
    name: 'Scope / limit key',
    allowsSorting: true,
    defaultWidth: '3.5fr',
    minWidth: 200,
  },
  {
    id: 'virtualObject',
    name: 'VO instance',
    allowsSorting: true,
    defaultWidth: '2.5fr',
    minWidth: 140,
  },
  {
    id: 'stages',
    name: 'Unfinished',
    allowsSorting: true,
    defaultWidth: '2fr',
    minWidth: 160,
  },
  {
    id: 'lastActivity',
    name: 'Last activity',
    allowsSorting: true,
    defaultWidth: '2fr',
    minWidth: 160,
  },
];

const rowStyles = tv({
  base: 'cursor-default transition-none [content-visibility:auto]',
});

const metricCellStyles = tv({
  slots: {
    root: 'grid w-full max-w-48 grid-cols-[minmax(0,1fr)_auto] items-center gap-2',
    bar: 'w-full min-w-0 justify-self-start',
    value:
      'justify-self-end text-right text-xs font-medium text-zinc-600 tabular-nums',
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
    label: 'Enqueued',
    title: 'Last enqueued at',
    key: 'last_enqueued_at',
  },
  { label: 'Started', title: 'Last started at', key: 'last_start_at' },
  { label: 'Attempted', title: 'Last attempted at', key: 'last_attempt_at' },
  { label: 'Finished', title: 'Last finished at', key: 'last_finish_at' },
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
            noun={{ one: 'unfinished entry', other: 'unfinished entries' }}
          />
        }
        className={metricCell.bar()}
        aria-label={`Unfinished entries: ${description}, total ${formatNumber(total)}`}
      />
      <span className={metricCell.value()}>{formatNumber(total, true)}</span>
    </div>
  );
}

function RelativeActivity({ activity }: { activity: Activity }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(activity.value));
  return (
    <DateTooltip
      date={new Date(activity.value)}
      title={activity.title}
      className="block w-full"
    >
      <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
        <time
          dateTime={activity.value}
          className="shrink-0 font-medium text-zinc-600 tabular-nums"
        >
          {duration} ago
        </time>
        <span className="truncate text-zinc-400">{activity.label}</span>
      </span>
    </DateTooltip>
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
        <Cell className="overflow-visible">
          <span className="flex min-w-0 items-center gap-2">
            <VQueueId id={row.id} popover={false} truncateInMiddle />
            <QueueStatus row={row} />
          </span>
        </Cell>
      );
    case 'service':
      return (
        <Cell className="overflow-visible">
          {row.service_name ? (
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
    case 'scope':
      return (
        <Cell className="overflow-visible">
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
    case 'virtualObject': {
      const identity = lockIdentity(row);
      return (
        <Cell className="overflow-visible">
          {identity ? (
            <VirtualObjectInstanceTarget
              identity={identity}
              href={virtualObjectInstanceHref(baseUrl, {
                ...identity,
                ...(row.scope ? { scope: row.scope } : {}),
              })}
              showService={false}
            />
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </Cell>
      );
    }
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
