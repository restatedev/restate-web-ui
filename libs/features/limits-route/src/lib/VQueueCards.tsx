import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { STATUS_STYLE } from '@restate/features/status-chart';
import {
  formatVqueueDuration,
  getVqueueGateLabel,
  vqueueDurationMilliseconds,
} from '@restate/features/vqueue-ui';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { DateTooltip, HoverTooltip } from '@restate/ui/tooltip';
import {
  formatDurations,
  formatMilliseconds,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { Fragment } from 'react';

const EVENTS = [
  {
    key: 'createdAt',
    label: 'Created',
    title: 'VQueue created',
    color: STATUS_STYLE.ready!,
  },
  {
    key: 'enqueuedAt',
    label: 'Last enqueue was',
    title: 'Last entry enqueued',
    color: STATUS_STYLE.inbox!,
  },
  {
    key: 'startAt',
    label: 'Last start was',
    title: 'Last entry started',
    color: STATUS_STYLE.running!,
  },
  {
    key: 'attemptAt',
    label: 'Last attempt was',
    title: 'Last entry attempted',
    color: STATUS_STYLE.running!,
  },
  {
    key: 'finishAt',
    label: 'Last finish was',
    title: 'Last entry finished',
    color: STATUS_STYLE.finished!,
  },
] as const;

type VqueueEventKey = (typeof EVENTS)[number]['key'];

const relativeDateStyles = tv({
  base: 'text-zinc-600 tabular-nums',
  variants: {
    emphasized: {
      true: 'text-sm font-semibold whitespace-nowrap text-zinc-700',
      false: 'text-xs',
    },
  },
});

const activityTimelineStyles = tv({
  slots: {
    body: 'relative flex flex-1 flex-col',
    heroRow:
      'grid w-full min-w-0 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-1.5',
    timeline: 'relative h-full w-full min-w-0',
    item: 'relative grid min-h-8 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-1.5',
    rail: 'absolute top-[1.625rem] bottom-0 left-5 w-px -translate-x-1/2 bg-gray-200',
    dot: 'relative z-1 flex h-2.5 w-2.5 items-center justify-center justify-self-center rounded-full border border-white shadow-xs',
    dotCenter: 'h-1 w-1 rounded-full',
    label: 'min-w-0 truncate text-xs font-normal text-zinc-600',
    heroLabel: 'min-w-0 truncate text-0.5xs font-medium text-gray-500',
  },
});

function ActivityDot({
  color,
}: {
  color: { fillLight: string; stroke: string };
}) {
  const styles = activityTimelineStyles();
  return (
    <span className={styles.dot()} style={{ backgroundColor: color.fillLight }}>
      <span
        className={styles.dotCenter()}
        style={{ backgroundColor: color.stroke }}
      />
    </span>
  );
}

function titleCase(value: string) {
  const words = value.replaceAll('-', ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function RelativeDate({
  date,
  title,
  emphasized = false,
  showAgo = true,
  tooltipClassName,
}: {
  date: string;
  title: string;
  emphasized?: boolean;
  showAgo?: boolean;
  tooltipClassName?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(date));
  return (
    <DateTooltip
      date={new Date(date)}
      title={title}
      className={tooltipClassName}
    >
      <time
        dateTime={date}
        aria-label={showAgo ? undefined : `${duration} ago`}
        className={relativeDateStyles({ emphasized })}
      >
        {duration}
        {showAgo && ' ago'}
      </time>
    </DateTooltip>
  );
}

const DURATION_ROWS = [
  { key: 'queue', label: 'Queue', color: STATUS_STYLE.waiting! },
  { key: 'inbox', label: 'Inbox', color: STATUS_STYLE.inbox! },
  { key: 'running', label: 'Running', color: STATUS_STYLE.running! },
  { key: 'suspended', label: 'Suspended', color: STATUS_STYLE.suspended! },
] as const;

const BLOCK_COLORS = [
  { fillLight: '#bfdbfe', stroke: '#3b82f6' },
  { fillLight: '#c4b5fd', stroke: '#8b5cf6' },
  { fillLight: '#fcd34d', stroke: '#f59e0b' },
  { fillLight: '#a7f3d0', stroke: '#10b981' },
  { fillLight: '#fbcfe8', stroke: '#ec4899' },
  { fillLight: '#cbd5e1', stroke: '#64748b' },
  { fillLight: '#fed7aa', stroke: '#f97316' },
] as const;

const KNOWN_BLOCK_COLOR_INDEX: Record<string, number> = {
  concurrency_rules: 0,
  'limit-key-concurrency': 0,
  throttling_rules: 1,
  invoker_concurrency: 2,
  'invoker-concurrency': 2,
  invoker_throttling: 3,
  'invoker-throttling': 3,
  invoker_memory: 4,
  'invoker-memory': 4,
  lock: 5,
  deployment_concurrency: 6,
  'deployment-concurrency': 6,
};

const durationBarStyles = tv({
  slots: {
    track:
      'relative h-2 min-w-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100',
    fill: 'absolute inset-y-0 left-0 rounded-full',
  },
});

const durationRowStyles = tv({
  base: 'grid w-full min-w-0 grid-cols-[minmax(6rem,0.8fr)_minmax(7rem,1.2fr)_8rem] items-center gap-3',
});

const blockTooltipStyles = tv({
  slots: {
    total:
      '-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1',
    row: '-mx-2 flex items-center gap-2.5 rounded-lg border-none bg-transparent px-2 py-1.5',
  },
});

function durationWidth(milliseconds: number | undefined, maximum: number) {
  if (!milliseconds || maximum <= 0) return 0;
  return Math.min(100, (milliseconds / maximum) * 100);
}

function DurationBar({
  milliseconds,
  maximum,
  color,
  className,
}: {
  milliseconds: number | undefined;
  maximum: number;
  color: { fillLight: string; stroke: string; background?: string };
  className?: string;
}) {
  const { track, fill } = durationBarStyles();
  const width = durationWidth(milliseconds, maximum);
  return (
    <div className={track({ className })}>
      <div
        className={fill()}
        style={{
          width: `${width}%`,
          minWidth: width > 0 ? 2 : 0,
          background:
            color.background ??
            `color-mix(in srgb, ${color.fillLight} 78%, white)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color.stroke} 62%, white)`,
        }}
      />
    </div>
  );
}

type BlockDuration = {
  gate: string;
  label: string;
  milliseconds: number;
  fillLight: string;
  stroke: string;
};

function blockColor(gate: string) {
  const knownIndex = KNOWN_BLOCK_COLOR_INDEX[gate];
  if (knownIndex !== undefined) return BLOCK_COLORS[knownIndex]!;
  const index = [...gate].reduce((sum, character) => {
    return (sum + character.charCodeAt(0)) % BLOCK_COLORS.length;
  }, 0);
  return BLOCK_COLORS[index]!;
}

function BlockBreakdownTooltip({
  blocks,
  total,
}: {
  blocks: BlockDuration[];
  total: number;
}) {
  const { total: totalStyles, row } = blockTooltipStyles();
  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <div className="text-base! leading-7 font-medium text-gray-300!">
          Blocked
        </div>
        <div className={totalStyles()}>
          <span className="!text-xl !text-gray-50 tabular-nums">
            {formatMilliseconds(total)}
          </span>
          <span className="!text-sm !text-gray-400">per dispatch attempt</span>
        </div>
      </div>
      <div className="-mx-3 border-t border-white/10" />
      <div className="mt-2 flex flex-col">
        {blocks.map((block) => (
          <div key={block.gate} className={row()}>
            <div
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{
                backgroundColor: block.fillLight,
                border: `1.5px solid ${block.stroke}`,
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35)',
              }}
            />
            <span className="pr-2 !text-0.5xs !text-gray-300">
              {block.label}
            </span>
            <span className="ml-auto !text-0.5xs font-semibold !text-gray-100 tabular-nums">
              {formatMilliseconds(block.milliseconds)}
            </span>
            <span className="!text-0.5xs font-medium !text-gray-300">
              (
              {total > 0
                ? formatPercentageWithoutFraction(block.milliseconds / total)
                : '0%'}
              )
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockDurationBar({
  blocks,
  total,
  maximum,
}: {
  blocks: BlockDuration[];
  total: number;
  maximum: number;
}) {
  const { track } = durationBarStyles();
  const width = durationWidth(total, maximum);
  const description = blocks
    .map((block) => `${block.label} ${formatMilliseconds(block.milliseconds)}`)
    .join(', ');
  const bar = (
    <div className={track()}>
      <div
        className="absolute inset-y-0 left-0 flex min-w-0 overflow-hidden rounded-full"
        style={{ width: `${width}%`, minWidth: width > 0 ? 2 : 0 }}
      >
        {blocks.map((block) => (
          <div
            key={block.gate}
            className="h-full min-w-px first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(block.milliseconds / total) * 100}%`,
              backgroundColor: `color-mix(in srgb, ${block.fillLight} 70%, white)`,
              boxShadow: `inset 0 0 0 1px ${block.stroke}`,
            }}
          />
        ))}
      </div>
    </div>
  );
  if (total <= 0) return bar;
  return (
    <HoverTooltip
      content={<BlockBreakdownTooltip blocks={blocks} total={total} />}
      size="lg"
      className="min-w-0"
    >
      <div
        role="img"
        aria-label={`Blocked: ${description}, total ${formatMilliseconds(total)}`}
      >
        {bar}
      </div>
    </HoverTooltip>
  );
}

export function VQueueDurationsCard({ data }: { data: VqueueSnapshot }) {
  const rows = DURATION_ROWS.map((row) => ({
    ...row,
    value: data.stageAvg[row.key],
    milliseconds: vqueueDurationMilliseconds(data.stageAvg[row.key]),
  }));
  const blocks = data.head.avgBlocks
    .map((block) => ({
      ...block,
      label: titleCase(getVqueueGateLabel(block.gate)),
      milliseconds: Math.max(
        0,
        vqueueDurationMilliseconds(block.duration) ?? 0,
      ),
      ...blockColor(block.gate),
    }))
    .filter((block) => block.milliseconds > 0);
  const blockTotal = blocks.reduce(
    (total, block) => total + block.milliseconds,
    0,
  );
  const endToEndMilliseconds = vqueueDurationMilliseconds(
    data.stageAvg.endToEnd,
  );
  const maximum = Math.max(
    endToEndMilliseconds ?? 0,
    blockTotal,
    ...rows.map((row) => row.milliseconds ?? 0),
  );
  return (
    <Card>
      <CardHeader title="Timing" icon={IconName.Timer}>
        <HoverTooltip content="Each value is averaged over its own events. End to end measures entries that complete normally; stage durations are measured when that stage exits, so a stage average can be longer than end to end.">
          <span className="cursor-help text-2xs font-normal text-gray-400 underline decoration-gray-300 decoration-dashed underline-offset-4">
            (each timing averages its own events)
          </span>
        </HoverTooltip>
      </CardHeader>
      <CardRow variant="hero">
        <div className={durationRowStyles()}>
          <div className="min-w-0">
            <div className="text-0.5xs font-medium text-gray-500">
              End to end
            </div>
            <div className="text-2xs text-gray-400">Completed entries</div>
          </div>
          <DurationBar
            milliseconds={endToEndMilliseconds}
            maximum={maximum}
            color={STATUS_STYLE.finished!}
            className="h-3"
          />
          <span className="text-right text-lg font-semibold text-zinc-700 tabular-nums">
            {formatVqueueDuration(data.stageAvg.endToEnd) ?? '—'}
          </span>
        </div>
      </CardRow>
      {rows.map((row) => (
        <Fragment key={row.key}>
          <CardRow>
            <div className={durationRowStyles()}>
              <span className="min-w-0 text-2xs font-medium text-gray-400">
                {row.label}
              </span>
              <DurationBar
                milliseconds={row.milliseconds}
                maximum={maximum}
                color={row.color}
              />
              <span className="text-right text-xs text-zinc-600 tabular-nums">
                {formatVqueueDuration(row.value) ?? '—'}
              </span>
            </div>
          </CardRow>
          {row.key === 'queue' && blocks.length > 0 && (
            <CardRow>
              <div className={durationRowStyles()}>
                <span className="min-w-0 text-2xs font-medium text-gray-400">
                  Blocked
                </span>
                <BlockDurationBar
                  blocks={blocks}
                  total={blockTotal}
                  maximum={maximum}
                />
                <span className="text-right text-xs text-zinc-600 tabular-nums">
                  {formatMilliseconds(blockTotal)}
                </span>
              </div>
            </CardRow>
          )}
        </Fragment>
      ))}
    </Card>
  );
}

export function VQueueActivityCard({ data }: { data: VqueueSnapshot }) {
  const activity = EVENTS.flatMap((event) => {
    const date = data.events[event.key];
    return date
      ? [
          {
            key: event.key as VqueueEventKey,
            label: event.label,
            title: event.title,
            color: event.color,
            date,
            timestamp: Date.parse(date),
          },
        ]
      : [];
  }).sort((left, right) => left.timestamp - right.timestamp);
  const created = activity.find((event) => event.key === 'createdAt');
  const rollingActivity = activity.filter((event) => event.key !== 'createdAt');
  const styles = activityTimelineStyles();

  return (
    <Card>
      <CardHeader title="Recent activities" icon={IconName.History} />
      {activity.length > 0 ? (
        <div className={styles.body()} role="list">
          <span className={styles.rail()} />
          {created && (
            <CardRow variant="hero">
              <div className={styles.heroRow()} role="listitem">
                <ActivityDot color={created.color} />
                <span className={styles.heroLabel()}>{created.label}</span>
                <RelativeDate
                  date={created.date}
                  title={`${created.title} at`}
                  emphasized
                  tooltipClassName="max-w-none! overflow-visible!"
                />
              </div>
            </CardRow>
          )}
          {rollingActivity.length > 0 && (
            <CardRow className="flex-1 items-stretch py-2.5">
              <div className={styles.timeline()}>
                {rollingActivity.map((event) => (
                  <div
                    key={event.key}
                    className={styles.item()}
                    role="listitem"
                  >
                    <ActivityDot color={event.color} />
                    <span className={styles.label()}>{event.label}</span>
                    <RelativeDate
                      date={event.date}
                      title={`${event.title} at`}
                      tooltipClassName="max-w-none! overflow-visible!"
                    />
                  </div>
                ))}
              </div>
            </CardRow>
          )}
        </div>
      ) : (
        <CardRow className="flex-1">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-2xs font-medium text-gray-400">
              No recorded activity
            </span>
            <span className="text-xs text-zinc-400">Never</span>
          </div>
        </CardRow>
      )}
    </Card>
  );
}
