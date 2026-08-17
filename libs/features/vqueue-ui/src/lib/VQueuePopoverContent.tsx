import type {
  InvocationSummaryStage,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import {
  DEFAULT_STYLE,
  getStatusFillStyle,
  STATUS_STYLE,
} from '@restate/features/status-chart';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';
import { DropdownSection } from '@restate/ui/dropdown';
import { MetricComparison } from '@restate/ui/metric-comparison';
import {
  formatCompactISODuration,
  formatDurations,
  formatNumber,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';
import { BlockedStatus } from './BlockedStatus';
import { LimitKey } from './LimitKey';
import {
  blockedLimitCounterIdentity,
  limitCountersForIdentityHref,
  limitCountersForRuleHref,
} from './limitCounterNavigation';
import {
  formatVqueueDuration,
  getVqueueHeadBlockSummary,
  getVqueueInboxWaitingStartedAt,
  positiveVqueueDurationMilliseconds,
  vqueueDurationPartsMilliseconds,
  vqueueDurationRatio,
} from './metrics';
import { ReadyStatus } from './ReadyStatus';
import { ScheduledStatus } from './ScheduledStatus';
import { VQueueIdDisplay } from './VQueueIdDisplay';

const INBOX_SLOT_LIMIT = 6;
const FOCUSED_INBOX_SLOT_LIMIT = 5;
const EMPTY_INBOX_SLOT_COUNT = 3;
type VQueueStage = 'inbox' | 'running' | 'suspended' | 'paused';

const STAGES: Array<{ stage: VQueueStage; label: string }> = [
  { stage: 'inbox', label: 'Inbox' },
  { stage: 'running', label: 'Running' },
  { stage: 'suspended', label: 'Suspended' },
  { stage: 'paused', label: 'Paused' },
];

const styles = tv({
  slots: {
    root: 'w-full min-w-0 bg-gray-100 px-0.5 pt-0.5 text-zinc-700',
    header: 'flex min-w-0 flex-nowrap items-center justify-between gap-2',
    identity: 'flex min-w-0 flex-1 items-center gap-2',
    stageSummaryContent:
      'flex w-full min-w-0 items-center gap-1.5 font-sans text-2xs',
    stageSummaryLabel: 'min-w-0 flex-1 truncate text-left text-inherit',
    stageSummaryStats:
      'flex shrink-0 items-baseline gap-1 font-medium text-zinc-800 tabular-nums selected:text-zinc-950',
    stageSummaryAverageValue:
      'font-normal text-gray-400 tabular-nums selected:text-zinc-500',
    panelBody: 'flex min-h-32 items-start bg-white px-4 py-3',
    head: 'flex w-fit min-w-0 flex-nowrap items-center gap-1.5',
    headIdentity: 'flex min-w-0 shrink items-center gap-1.5',
    entryIdentity: 'max-w-44 min-w-0 shrink',
    entryId: 'max-w-32 min-w-0 truncate font-mono text-2xs text-zinc-600',
    headStatus:
      'flex min-w-0 flex-1 flex-nowrap items-center gap-x-1.5 text-2xs',
    statusTime:
      'inline-flex shrink-0 items-baseline gap-1 text-2xs font-normal whitespace-nowrap text-zinc-500/80',
    blockComparison:
      'inline-flex shrink-0 items-baseline gap-1 text-3xs whitespace-nowrap text-zinc-500',
  },
});

const inboxPanelStyles = tv({
  base: 'flex w-max min-w-0 flex-col items-start justify-center self-stretch',
  variants: {
    standalone: {
      true: 'max-w-[min(34rem,calc(100vw-3rem))]',
      false: 'max-w-[min(34rem,calc(100vw-16rem))]',
    },
  },
  defaultVariants: {
    standalone: false,
  },
});

const orderStyles = tv({
  base: 'relative flex min-w-0 flex-col items-start pt-1',
});

const orderFlowStyles = tv({
  base: 'relative ml-3 min-w-0',
});

const orderColumnStyles = tv({
  base: 'relative w-full min-w-0 before:pointer-events-none before:absolute before:inset-y-0 before:left-3 before:w-px before:-translate-x-1/2 before:bg-linear-to-t before:from-gray-300/10 before:via-gray-300/40 before:to-gray-300/75 before:content-["_"]',
});

const orderSlotContainerStyles = tv({
  base: 'relative -ml-3 flex min-h-3 min-w-0 items-center gap-1.5',
});

const orderSlotsStyles = tv({
  base: 'relative flex min-w-0 flex-col items-start gap-1 overflow-visible',
});

const orderSlotStyles = tv({
  base: 'relative z-10 h-2 w-6 shrink-0 rounded-full border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)]',
  variants: {
    focus: {
      true: "after:pointer-events-none after:absolute after:inset-px after:animate-pulse after:rounded-full after:bg-amber-400/70 after:content-[''] motion-reduce:after:animate-none",
      false: '',
    },
  },
});

const orderGapStyles = tv({
  base: 'relative z-10 -ml-3 flex h-4 min-w-0 items-center gap-1.5',
});

const orderGapMarkStyles = tv({
  base: 'flex h-4 w-6 shrink-0 items-center justify-center bg-white text-xs leading-none text-gray-400',
});

const orderGapCountStyles = tv({
  base: 'text-3xs leading-none font-normal whitespace-nowrap text-gray-400 tabular-nums',
});

const emptyOrderSlotStyles = tv({
  base: 'relative z-10 h-2 w-6 shrink-0 rounded-full border border-dashed border-gray-200 bg-white/70',
});

const emptyOrderLabelStyles = tv({
  base: 'text-3xs leading-none font-normal whitespace-nowrap text-gray-300 tabular-nums',
});

const orderDirectionStyles = tv({
  base: 'relative z-10 ml-3 h-4 w-px shrink-0 -translate-x-1/2 text-gray-300/75 [&_svg]:absolute [&_svg]:-top-0.5 [&_svg]:left-1/2 [&_svg]:h-2.5 [&_svg]:w-3 [&_svg]:-translate-x-1/2',
});

const orderFocusDetailsStyles = tv({
  base: 'pointer-events-auto z-10 flex w-max max-w-md min-w-0 flex-col items-start gap-0.5 font-sans whitespace-nowrap',
});

const orderFocusPointerStyles = tv({
  base: 'pointer-events-none z-10 h-1.5 w-2 shrink-0 overflow-visible',
});

const orderFocusPointerDirectionStyles = tv({
  base: 'block h-full w-full rotate-90 overflow-visible',
});

const selectedEntryArrowStyles = tv({
  base: 'block h-full w-full animate-bounce overflow-visible [animation-duration:1.8s] motion-reduce:animate-none',
});

const orderFocusPositionStyles = tv({
  base: 'inline-flex h-4 min-w-0 items-center gap-1 text-3xs leading-none font-normal tabular-nums',
  variants: {
    timing: {
      scheduled: 'text-gray-500',
      waiting: 'text-amber-700',
    },
  },
});

const orderFocusAverageStyles = tv({
  base: 'inline-flex items-baseline gap-1 text-3xs leading-none font-normal text-gray-400 tabular-nums',
});

const orderFocusEntryIdStyles = tv({
  base: 'max-w-64 truncate text-3xs leading-none font-normal text-zinc-500',
});

const headIdentityAnchorStyles = tv({
  base: 'relative w-fit min-w-0 shrink rounded-lg',
});

const headOnlyGroupStyles = tv({
  base: 'flex w-fit max-w-full min-w-0 flex-col items-start',
});

const stageLayoutStyles = tv({
  base: 'min-w-0 items-stretch gap-0 bg-white',
  variants: {
    hasInboxDetails: {
      true: 'grid w-max max-w-[min(47rem,calc(100vw-3rem))] grid-cols-[13rem_fit-content(34rem)]',
      false: 'flex w-full',
    },
  },
});

const stageListStyles = tv({
  base: 'flex flex-col gap-1 p-1.5',
  variants: {
    hasInboxDetails: {
      true: 'w-52 shrink-0 rounded-l-xl rounded-r-none border-r border-gray-200 bg-gray-100/80 pr-0',
      false: 'w-full rounded-xl bg-white',
    },
  },
});

const stageSummaryStyles = tv({
  base: 'z-0 flex min-w-0 cursor-default items-center justify-start px-3 py-2 text-zinc-600',
  variants: {
    presentation: {
      connected:
        'z-10 -mr-px rounded-l-lg rounded-r-none border border-r-0 border-black/10 bg-white text-zinc-950',
      focused:
        'rounded-lg border border-black/10 bg-white text-zinc-950 shadow-xs',
      default: 'rounded-lg',
    },
  },
});

const stageDetailsStyles = tv({
  base: 'max-w-[min(34rem,calc(100vw-16rem))] min-w-max overflow-visible bg-white',
});

const stageMarkStyles = tv({
  base: 'h-2.5 w-2.5 shrink-0 rounded-[3px] border',
  variants: {
    stage: {
      inbox: 'border-dashed',
      running: 'border-dashed',
      suspended: 'border-solid',
      paused: 'border-solid',
    },
  },
});

function formatIdentifier(id: string) {
  return id.length > 22 ? `${id.slice(0, 10)}…${id.slice(-5)}` : id;
}

function getStageCount(data: VqueueSnapshot, stage: VQueueStage) {
  return data.counts[stage];
}

function getStageAverage(data: VqueueSnapshot, stage: VQueueStage) {
  if (stage === 'inbox') return data.stageAvg.inbox ?? data.stageAvg.queue;
  if (stage === 'running') return data.stageAvg.running;
  if (stage === 'suspended') return data.stageAvg.suspended;
  return undefined;
}

function getStageVisual(stage: VQueueStage) {
  return STATUS_STYLE[stage] ?? DEFAULT_STYLE;
}

export type InboxOrderItem =
  | { type: 'entry'; index: number }
  | { type: 'gap'; count: number; position: 'before' | 'after' };

export function inboxOrderItems(
  total: number,
  focusIndex?: number,
): InboxOrderItem[] {
  if (total <= 0) return [];

  const hasFocus =
    focusIndex !== undefined && focusIndex >= 0 && focusIndex < total;
  const visibleCount = Math.min(
    hasFocus ? FOCUSED_INBOX_SLOT_LIMIT : INBOX_SLOT_LIMIT,
    total,
  );
  const windowStart = hasFocus
    ? Math.max(
        0,
        Math.min(
          focusIndex - Math.floor(visibleCount / 2),
          total - visibleCount,
        ),
      )
    : 0;
  const windowEnd = windowStart + visibleCount;
  const items: InboxOrderItem[] = [];

  if (windowStart > 0) {
    items.push({ type: 'gap', count: windowStart, position: 'before' });
  }
  for (let index = windowStart; index < windowEnd; index += 1) {
    items.push({ type: 'entry', index });
  }
  if (windowEnd < total) {
    items.push({ type: 'gap', count: total - windowEnd, position: 'after' });
  }

  return items;
}

function SelectedEntryArrow({ className }: { className: string }) {
  const inboxVisual = getStageVisual('inbox');

  return (
    <span aria-hidden="true" className={className}>
      <span className={orderFocusPointerDirectionStyles()}>
        <svg className={selectedEntryArrowStyles()} viewBox="0 0 10 7">
          <path
            d="M1.45.25C.55.14.08.9.55 1.55l3.57 4.84c.44.6 1.32.6 1.76 0l3.57-4.84C9.92.9 9.45.14 8.55.25c-2.34.62-4.76.62-7.1 0Z"
            fill={inboxVisual.stroke}
          />
        </svg>
      </span>
    </span>
  );
}

function SelectedEntryPointer() {
  return <SelectedEntryArrow className={orderFocusPointerStyles()} />;
}

function SelectedEntryMarker({
  entryId,
  position,
  timing,
  nextTransition,
  queueDuration,
  queueAverage,
  queueAverageRatio,
}: {
  entryId: string;
  position: number;
  timing: 'scheduled' | 'waiting';
  nextTransition?: string;
  queueDuration?: string;
  queueAverage?: string;
  queueAverageRatio?: string;
}) {
  const entriesAhead = Math.max(0, position - 1);
  const detail =
    timing === 'waiting'
      ? entriesAhead === 0
        ? 'Next'
        : undefined
      : nextTransition;

  return (
    <>
      <SelectedEntryPointer />
      {(detail || entriesAhead > 0) && (
        <span className={orderFocusDetailsStyles()}>
          <span
            className={orderFocusPositionStyles({ timing })}
            title={
              timing === 'waiting'
                ? `Selected entry: ${entryId}, ${formatNumber(entriesAhead)} ${entriesAhead === 1 ? 'entry' : 'entries'} ahead${queueDuration ? `, in queue for ${queueDuration}` : ''}${queueAverageRatio ? `, ${queueAverageRatio} times the historical average queue time` : queueAverage ? `, historical average queue time ${queueAverage}` : ''}`
                : `Selected entry: ${entryId}, next transition ${detail}`
            }
          >
            {timing === 'waiting' && entriesAhead > 0 ? (
              <>
                <span>
                  Waiting behind{' '}
                  <span className="font-semibold">
                    {formatNumber(entriesAhead, true)}{' '}
                    {entriesAhead === 1 ? 'entry' : 'entries'}
                  </span>
                </span>
                {queueDuration ? (
                  <span className={orderFocusAverageStyles()}>
                    <span aria-hidden="true">·</span>
                    <span>in queue</span>
                    <MetricComparison
                      value={queueDuration}
                      ratio={queueAverageRatio}
                      average={queueAverage}
                      label="Current queue time"
                      size="xs"
                      decorative
                    />
                  </span>
                ) : (
                  queueAverage && (
                    <span className={orderFocusAverageStyles()}>
                      <span aria-hidden="true">·</span> avg queue{' '}
                      <span className="font-semibold text-zinc-600">
                        {queueAverage}
                      </span>
                    </span>
                  )
                )}
              </>
            ) : (
              <span className="font-medium">{detail}</span>
            )}
          </span>
          <span className={orderFocusEntryIdStyles()}>
            {formatIdentifier(entryId)}
          </span>
        </span>
      )}
    </>
  );
}

export function VQueueHeadBlockedStatus({
  data,
  showComparison = true,
  ruleLimit,
  counterUsage,
  onOpenChange,
}: {
  data: VqueueSnapshot;
  showComparison?: boolean;
  ruleLimit?: number;
  counterUsage?: number;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const { baseUrl } = useRestateContext();
  const { scheduling } = data.status;
  if (
    data.identity.isPaused ||
    (!data.status.blocked && scheduling !== 'blocked')
  ) {
    return null;
  }
  const {
    reason,
    blockedDuration,
    duration,
    average,
    ratio: averageRatio,
  } = getVqueueHeadBlockSummary(data);
  const resource = data.status.blockedResource;
  const counterIdentity = resource
    ? blockedLimitCounterIdentity(resource)
    : undefined;
  return (
    <div className={styles().headStatus()}>
      <BlockedStatus
        reason={reason}
        resource={resource}
        blockedDuration={blockedDuration}
        counterHref={
          counterIdentity
            ? limitCountersForIdentityHref(
                baseUrl,
                counterIdentity,
                resource?.blockedRule,
              )
            : undefined
        }
        ruleHref={
          resource?.blockedRule
            ? limitCountersForRuleHref(baseUrl, resource.blockedRule)
            : undefined
        }
        ruleLimit={ruleLimit}
        counterUsage={counterUsage}
        onOpenChange={onOpenChange}
      />
      {showComparison && duration && (
        <span className={styles().statusTime()}>
          <span>for</span>
          <MetricComparison
            value={duration}
            ratio={averageRatio}
            average={average}
            label="Blocked duration"
            size="xs"
          />
        </span>
      )}
      {showComparison && !duration && average && (
        <span className={styles().blockComparison()}>
          <span>Typical block</span>
          <span className="font-medium text-zinc-600 tabular-nums">
            {average}
          </span>
        </span>
      )}
    </div>
  );
}

export function VQueueHeadVerdict({ data }: { data: VqueueSnapshot }) {
  const { scheduling } = data.status;
  if (data.identity.isPaused) return null;
  if (data.status.blocked || scheduling === 'blocked') {
    return <VQueueHeadBlockedStatus data={data} />;
  }
  if (scheduling === 'scheduled') {
    return <ScheduledStatus scheduledAt={data.status.scheduledAt} />;
  }
  if (scheduling === 'ready') {
    return <ReadyStatus />;
  }
  return null;
}

function StageSummary({
  data,
  stage,
  label,
  connected,
}: {
  data: VqueueSnapshot;
  stage: VQueueStage;
  label: string;
  connected: boolean;
}) {
  const visual = getStageVisual(stage);
  const focused = data.focusEntry?.stage === stage;
  const presentation = connected
    ? 'connected'
    : focused
      ? 'focused'
      : 'default';
  const count = getStageCount(data, stage);
  const averageDuration = getStageAverage(data, stage);
  const showAverage = stage !== 'paused' && !(stage === 'inbox' && connected);
  const average = formatVqueueDuration(averageDuration);
  const compactAverage = averageDuration
    ? formatCompactISODuration(averageDuration)
    : undefined;
  const exactSummary = showAverage
    ? `${formatNumber(count)} (avg ${average ?? '—'})`
    : formatNumber(count);
  return (
    <div
      role="listitem"
      aria-label={`${label} ${exactSummary}`}
      className={stageSummaryStyles({ presentation })}
    >
      <span className={styles().stageSummaryContent()}>
        <span
          aria-hidden
          className={stageMarkStyles({ stage })}
          style={{
            backgroundColor: visual.fillLight,
            borderColor: visual.stroke,
          }}
        />
        <span className={styles().stageSummaryLabel()}>{label}</span>
        <span className={styles().stageSummaryStats()} title={exactSummary}>
          <span>{formatNumber(count, true)}</span>
          {showAverage && (
            <span className={styles().stageSummaryAverageValue()}>
              (avg {compactAverage ?? '—'})
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

function InboxOrder({ data }: { data: VqueueSnapshot }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const headIsInbox = data.head.stage === 'inbox';
  const count = Math.max(0, data.counts.inbox - (headIsInbox ? 1 : 0));
  const queueAverageMilliseconds = positiveVqueueDurationMilliseconds(
    data.stageAvg.queue,
  );
  const queueAverage =
    queueAverageMilliseconds && data.stageAvg.queue
      ? formatCompactISODuration(data.stageAvg.queue)
      : undefined;
  const focus =
    data.focusEntry?.stage === 'inbox' &&
    data.focusEntry.id !== data.head.entryId
      ? data.focusEntry
      : undefined;
  const focusTiming = focus?.nextAt
    ? durationSinceLastSnapshot(focus.nextAt)
    : undefined;
  const focusIsWaiting = !focusTiming || focusTiming.isPast === true;
  const focusNextTransition =
    focusTiming && focusTiming.isPast !== true
      ? `in ${formatDurations(focusTiming)}`
      : undefined;
  const focusQueueStartedAt = getVqueueInboxWaitingStartedAt(
    focus,
    focusTiming?.isPast,
  );
  const focusQueueTiming = focusQueueStartedAt
    ? durationSinceLastSnapshot(focusQueueStartedAt)
    : undefined;
  const focusQueueDuration =
    focusIsWaiting &&
    focusQueueStartedAt &&
    focusQueueTiming &&
    focusQueueTiming.isPast !== false
      ? formatDurations(focusQueueTiming)
      : undefined;
  const focusQueueMilliseconds = focusQueueDuration
    ? vqueueDurationPartsMilliseconds(focusQueueTiming ?? {})
    : undefined;
  const queueAverageRatio = vqueueDurationRatio(
    focusQueueMilliseconds,
    queueAverageMilliseconds,
  );
  const focusPosition = focus?.position;
  const positionBehindHead = focusPosition
    ? focusPosition - (headIsInbox ? 1 : 0)
    : undefined;
  const focusIndex = positionBehindHead ? positionBehindHead - 1 : undefined;
  const orderItems = inboxOrderItems(count, focusIndex);
  const inboxVisual = getStageVisual('inbox');
  const inboxFillStyle = getStatusFillStyle(inboxVisual);

  if (count === 0) return null;

  return (
    <div
      className={orderFlowStyles()}
      role="img"
      aria-label={`Inbox execution order with ${formatNumber(count)} ${count === 1 ? 'entry' : 'entries'} behind the next entry to process${focusPosition ? (focusIsWaiting ? `. Selected entry has ${formatNumber(Math.max(0, focusPosition - 1))} ${focusPosition === 2 ? 'entry' : 'entries'} ahead${focusQueueDuration ? `; current queue time is ${focusQueueDuration}${queueAverageRatio ? `, ${queueAverageRatio} times the historical average` : ''}` : queueAverage ? `; historical average queue time is ${queueAverage}` : ''}` : focusNextTransition ? `. Selected entry is scheduled ${focusNextTransition}` : '') : ''}`}
    >
      <div className={orderStyles()}>
        <div className={orderSlotsStyles()}>
          {orderItems.map((item) => {
            if (item.type === 'gap') {
              return (
                <span
                  key={`gap-${item.position}`}
                  aria-hidden="true"
                  className={orderGapStyles()}
                  title={`${formatNumber(item.count, true)} ${item.count === 1 ? 'entry' : 'entries'} omitted`}
                >
                  <span className={orderGapMarkStyles()}>⋮</span>
                  <span className={orderGapCountStyles()}>
                    +{formatNumber(item.count, true)}
                  </span>
                </span>
              );
            }

            const isFocus = item.index === focusIndex;
            return (
              <span
                key={item.index}
                aria-hidden="true"
                className={orderSlotContainerStyles()}
              >
                <span
                  className={orderSlotStyles({ focus: isFocus })}
                  style={{
                    ...inboxFillStyle,
                    borderColor: inboxVisual.stroke,
                  }}
                />
                {isFocus && focus && focusPosition && (
                  <SelectedEntryMarker
                    entryId={focus.id}
                    position={focusPosition}
                    timing={focusIsWaiting ? 'waiting' : 'scheduled'}
                    nextTransition={focusNextTransition}
                    queueDuration={focusQueueDuration}
                    queueAverage={focusIsWaiting ? queueAverage : undefined}
                    queueAverageRatio={queueAverageRatio}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyInboxOrder() {
  return (
    <div
      className={orderFlowStyles()}
      role="img"
      aria-label="No Inbox entries behind the next entry to process"
    >
      <div className={orderStyles()}>
        <div className={orderSlotsStyles()}>
          {Array.from({ length: EMPTY_INBOX_SLOT_COUNT }, (_, index) => (
            <span key={index} className={orderSlotContainerStyles()}>
              <span aria-hidden="true" className={emptyOrderSlotStyles()} />
              {index === 0 && (
                <span aria-hidden="true" className={emptyOrderLabelStyles()}>
                  0 behind
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderDirection() {
  return (
    <span aria-hidden="true" className={orderDirectionStyles()}>
      <svg viewBox="0 0 10 6" fill="none">
        <path
          d="M1 5 5 1 9 5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export type VQueueEntryIdRenderer = (entryId: string) => ReactNode;

function Head({
  data,
  entryId,
  renderEntryId,
}: {
  data: VqueueSnapshot;
  entryId: string;
  renderEntryId?: VQueueEntryIdRenderer;
}) {
  return (
    <div
      role="group"
      aria-label="Next entry to process"
      className={styles().head()}
    >
      <div className={headIdentityAnchorStyles()}>
        <div className={styles().headIdentity()}>
          {renderEntryId ? (
            <div className={styles().entryIdentity()}>
              {renderEntryId(entryId)}
            </div>
          ) : (
            <span className={styles().entryId()} title={entryId}>
              {formatIdentifier(entryId)}
            </span>
          )}
        </div>
      </div>
      <VQueueHeadVerdict data={data} />
    </div>
  );
}

function InboxOverview({
  data,
  renderEntryId,
  standalone = false,
}: {
  data: VqueueSnapshot;
  renderEntryId?: VQueueEntryIdRenderer;
  standalone?: boolean;
}) {
  const headEntryId = data.head.entryId;
  const hasInbox = data.counts.inbox > 0;
  const entriesBeforeHead = Math.max(
    0,
    data.counts.inbox - (data.head.stage === 'inbox' ? 1 : 0),
  );
  const showEmptyOrder =
    Boolean(headEntryId) &&
    data.head.stage === 'inbox' &&
    data.counts.inbox === 1;

  const head = headEntryId ? (
    <Head data={data} entryId={headEntryId} renderEntryId={renderEntryId} />
  ) : null;

  return (
    <div className={styles().panelBody()}>
      <div className={inboxPanelStyles({ standalone })}>
        {showEmptyOrder ? (
          <div className={headOnlyGroupStyles()}>
            {head}
            <div className={orderColumnStyles()}>
              <OrderDirection />
              <EmptyInboxOrder />
            </div>
          </div>
        ) : (
          head
        )}
        {!showEmptyOrder && headEntryId && entriesBeforeHead > 0 ? (
          <div className={orderColumnStyles()}>
            <OrderDirection />
            <InboxOrder data={data} />
          </div>
        ) : (
          !showEmptyOrder && hasInbox && <InboxOrder data={data} />
        )}
      </div>
    </div>
  );
}

export interface VQueuePopoverContentProps {
  data: VqueueSnapshot;
  className?: string;
  focusStage?: InvocationSummaryStage;
  renderEntryId?: VQueueEntryIdRenderer;
}

export interface VQueueInboxPopoverContentProps {
  data: VqueueSnapshot;
  className?: string;
  renderEntryId?: VQueueEntryIdRenderer;
}

function VQueuePopoverHeader({ data }: { data: VqueueSnapshot }) {
  const contentStyles = styles();

  return (
    <div className={contentStyles.header()}>
      <div className={contentStyles.identity()}>
        <VQueueIdDisplay
          id={data.identity.vqueueId}
          size="md"
          className="min-w-0 shrink font-normal"
        />
        <Copy
          copyText={data.identity.vqueueId}
          className="ml-0 h-5 w-5 shrink-0 rounded-md p-1 text-gray-500"
        />
        {data.identity.isPaused && (
          <Badge variant="warning" size="xs">
            Paused
          </Badge>
        )}
      </div>
      <LimitKey
        value={data.identity.limitKey}
        className="ml-auto max-w-[45%] min-w-0 shrink"
      />
    </div>
  );
}

function VQueueInboxPopoverHeader({ data }: { data: VqueueSnapshot }) {
  const visual = getStageVisual('inbox');

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={stageMarkStyles({ stage: 'inbox' })}
        style={{
          backgroundColor: visual.fillLight,
          borderColor: visual.stroke,
        }}
      />
      <span>Inbox</span>
      <span className="font-medium text-zinc-700 tabular-nums">
        {formatNumber(data.counts.inbox, true)}
      </span>
    </div>
  );
}

export function VQueueInboxPopoverContent({
  data,
  className,
  renderEntryId,
}: VQueueInboxPopoverContentProps) {
  const contentStyles = styles();

  return (
    <div className={contentStyles.root({ className })}>
      <DropdownSection
        className="overflow-hidden"
        headerClassName="px-3"
        title={<VQueueInboxPopoverHeader data={data} />}
      >
        <div className="w-max max-w-[min(34rem,calc(100vw-3rem))] bg-white">
          <InboxOverview data={data} renderEntryId={renderEntryId} standalone />
        </div>
      </DropdownSection>
    </div>
  );
}

export function VQueuePopoverContent({
  data,
  className,
  focusStage,
  renderEntryId,
}: VQueuePopoverContentProps) {
  const hasInboxDetails = data.counts.inbox > 0 || Boolean(data.head.entryId);
  const selectedStage = data.focusEntry?.stage ?? focusStage;
  const showInboxDetails =
    hasInboxDetails && (!selectedStage || selectedStage === 'inbox');
  const contentStyles = styles();

  return (
    <div className={contentStyles.root({ className })}>
      <DropdownSection
        className="overflow-hidden"
        headerClassName="pr-1 pl-2"
        title={<VQueuePopoverHeader data={data} />}
      >
        <div
          className={stageLayoutStyles({
            hasInboxDetails: showInboxDetails,
          })}
        >
          <div
            role="list"
            aria-label="Entry stages"
            className={stageListStyles({
              hasInboxDetails: showInboxDetails,
            })}
          >
            {STAGES.map((stage) => (
              <StageSummary
                key={stage.stage}
                data={data}
                connected={showInboxDetails && stage.stage === 'inbox'}
                {...stage}
              />
            ))}
          </div>
          {showInboxDetails && (
            <div className={stageDetailsStyles()}>
              <InboxOverview data={data} renderEntryId={renderEntryId} />
            </div>
          )}
        </div>
      </DropdownSection>
    </div>
  );
}
