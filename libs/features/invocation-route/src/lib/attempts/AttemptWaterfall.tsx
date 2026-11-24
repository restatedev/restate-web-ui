import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import type { CSSProperties, ReactNode } from 'react';
import type {
  ActionNode,
  Attempt,
  AttemptRecord,
  RecordNode,
} from './attemptRecord';
import { walkNodes } from './attemptRecord';
import {
  GAP_LABEL,
  OutcomeBadge,
  RowIcon,
  actionIcon,
  actionLabel,
  causeLabel,
  formatOffset,
  formatSpan,
  isSend,
  nodeTone,
  outcomeKey,
} from './AttemptParts';
import type { WaterfallScale } from './waterfallScale';

type Row =
  | { type: 'root'; key: string }
  | { type: 'attempt'; key: string; attempt: Attempt }
  | {
      type: 'node';
      key: string;
      attempt: Attempt;
      node: RecordNode;
      depth: number;
    };

const LAYOUT = 'grid grid-cols-[var(--label-w)_minmax(0,1fr)]';

const headerRowStyles = tv({
  base: `${LAYOUT} h-12 border-b border-default bg-subtle text-2xs`,
});

const overlayStyles = tv({
  base: 'pointer-events-none absolute inset-y-0 right-3 left-[calc(var(--label-w)+0.75rem)]',
});

const rowStyles = tv({
  base: `${LAYOUT} min-h-7 items-stretch border-b border-muted/70 last:border-b-0`,
  variants: {
    type: {
      root: 'min-h-9 bg-subtle/70',
      attempt: 'min-h-9 border-t border-t-default bg-subtle/40',
      node: 'hover:bg-tint-subtle',
    },
  },
});

const barStyles = tv({
  base: 'absolute top-1/2 -translate-y-1/2 rounded-sm',
  variants: {
    tone: {
      root: 'h-1.5 rounded-full bg-strong',
      returned:
        'h-3.5 bg-success-vivid shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/30%)]',
      failed:
        'h-3.5 bg-danger-vivid shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/30%)]',
      warning:
        'h-3.5 bg-warning-vivid shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/30%)]',
      suspended:
        'h-3.5 bg-neutral shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/30%)]',
      running: 'h-3.5 animate-pulse bg-info-vivid',
      span: 'h-2.5 bg-accent-vivid/70',
      spanFailure: 'h-2.5 bg-danger-vivid/70',
      spanCut: 'h-2.5 border border-dashed border-accent bg-accent-vivid/25',
      call: 'h-2 bg-info-vivid/70',
      callOpen: 'h-2 border border-dashed border-info bg-info-vivid/15',
      readSignal: 'h-2 bg-pending-vivid/60',
    },
    isRootSegment: {
      true: 'h-2.5',
      false: '',
    },
  },
});

const markerStyles = tv({
  base: 'absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-surface shadow-xs',
  variants: {
    tone: {
      default: 'bg-neutral-strong',
      group: 'h-3 w-3 bg-category-2',
      call: 'bg-info-vivid',
      span: 'bg-accent-vivid',
      danger: 'bg-danger-vivid',
      send: 'rotate-0 rounded-full bg-info-vivid',
    },
  },
});

const labelStyles = tv({
  base: 'flex min-w-0 items-center gap-1.5 border-r border-muted pr-2 text-xs',
});

function pct(value: number) {
  return `${(value * 100).toFixed(3)}%`;
}

function barStyle(
  scale: WaterfallScale,
  from: number,
  to: number,
): CSSProperties {
  const x0 = scale.x(from);
  const x1 = scale.x(to);
  return { left: pct(x0), width: `max(3px, ${pct(Math.max(x1 - x0, 0))})` };
}

function attemptTone(attempt: Attempt) {
  const key = outcomeKey(attempt);
  if (key === 'returned') {
    return attempt.ended?.failure ? 'failed' : 'returned';
  }
  if (key === 'failed' || key === 'killed') {
    return 'failed';
  }
  if (key === 'suspended' || key === 'unknown') {
    return 'suspended';
  }
  if (key === 'running') {
    return 'running';
  }
  return 'warning';
}

export function AttemptWaterfall({
  record,
  scale,
  title,
  expanded,
  onExpandedChange,
  focusedAttempt,
  onFocusAttempt,
}: {
  record: AttemptRecord;
  scale: WaterfallScale;
  title: ReactNode;
  expanded: Set<number>;
  onExpandedChange: (attempt: number, isExpanded: boolean) => void;
  focusedAttempt?: number;
  onFocusAttempt: (attempt?: number) => void;
}) {
  const rows: Row[] = [{ type: 'root', key: 'root' }];
  for (const attempt of record.attempts) {
    rows.push({ type: 'attempt', key: `attempt-${attempt.attempt}`, attempt });
    if (expanded.has(attempt.attempt)) {
      walkNodes(attempt.nodes, (node, depth) => {
        rows.push({ type: 'node', key: node.key, attempt, node, depth });
      });
    }
  }

  return (
    <div
      className="relative min-w-[44rem] overflow-hidden rounded-xl border border-default bg-surface shadow-xs [--label-w:clamp(15rem,34%,26rem)]"
      role="table"
      aria-label="Attempt waterfall"
    >
      <div className={headerRowStyles()}>
        <div className="flex items-end px-3 pb-1 font-medium text-muted">
          Invocation · attempts · spans and actions
        </div>
        <div className="relative mx-3">
          {gapLabels(record, scale).map(({ gap, x0, x1 }) => {
            return (
              <span
                key={gap.key}
                className="absolute top-1 inline-flex items-center gap-1 rounded-full border border-dashed border-strong bg-surface px-1.5 text-2xs leading-4 whitespace-nowrap text-tertiary"
                style={{
                  left: pct((x0 + x1) / 2),
                  transform: `translateX(${(x0 + x1) / 2 > 0.8 ? -100 : (x0 + x1) / 2 < 0.2 ? 0 : -50}%)`,
                }}
              >
                <Icon
                  name={
                    gap.kind === 'suspended' ? IconName.Pause : IconName.Timer
                  }
                  className="h-2.5 w-2.5 text-subtle"
                />
                {GAP_LABEL[gap.kind]} {formatSpan(gap.to - gap.from)}
                {gap.isOngoing ? '…' : ''}
                {scale.isCompressed && (
                  <span className="text-subtle">(compressed)</span>
                )}
              </span>
            );
          })}
          {scale.ticks.map((tick) => (
            <span
              key={`${tick.time}-${tick.x}`}
              className="absolute bottom-1 -translate-x-1/2 text-muted tabular-nums first:translate-x-0"
              style={{ left: pct(tick.x) }}
            >
              {formatOffset(tick.time - scale.start)}
            </span>
          ))}
        </div>
      </div>
      <div className="relative">
        <IdleOverlay record={record} scale={scale} />
        <div className={overlayStyles()}>
          {scale.ticks.map((tick) => (
            <span
              key={`${tick.time}-${tick.x}`}
              className="absolute inset-y-0 border-l border-dotted border-tint"
              style={{ left: pct(tick.x) }}
            />
          ))}
        </div>
        {rows.map((row) => {
          if (row.type === 'root') {
            return (
              <RootRow
                key={row.key}
                record={record}
                scale={scale}
                title={title}
              />
            );
          }
          if (row.type === 'attempt') {
            return (
              <AttemptRow
                key={row.key}
                attempt={row.attempt}
                record={record}
                scale={scale}
                isExpanded={expanded.has(row.attempt.attempt)}
                isFocused={focusedAttempt === row.attempt.attempt}
                onFocus={() =>
                  onFocusAttempt(
                    focusedAttempt === row.attempt.attempt
                      ? undefined
                      : row.attempt.attempt,
                  )
                }
                onToggle={() =>
                  onExpandedChange(
                    row.attempt.attempt,
                    !expanded.has(row.attempt.attempt),
                  )
                }
              />
            );
          }
          return (
            <NodeRow
              key={row.key}
              node={row.node}
              attempt={row.attempt}
              depth={row.depth}
              scale={scale}
            />
          );
        })}
      </div>
    </div>
  );
}

function gapLabels(record: AttemptRecord, scale: WaterfallScale) {
  const labels: {
    gap: AttemptRecord['gaps'][number];
    x0: number;
    x1: number;
  }[] = [];
  let lastCenter = -1;
  for (const gap of record.gaps) {
    const x0 = scale.x(gap.from);
    const x1 = scale.x(gap.to);
    const center = (x0 + x1) / 2;
    if (x1 - x0 <= 0 || center - lastCenter < 0.16) {
      continue;
    }
    labels.push({ gap, x0, x1 });
    lastCenter = center;
  }
  return labels;
}

function IdleOverlay({
  record,
  scale,
}: {
  record: AttemptRecord;
  scale: WaterfallScale;
}) {
  return (
    <div className={overlayStyles({ className: 'z-0' })}>
      {record.gaps.map((gap) => {
        const x0 = scale.x(gap.from);
        const x1 = scale.x(gap.to);
        if (x1 - x0 <= 0) {
          return null;
        }
        return (
          <div
            key={gap.key}
            className="absolute inset-y-0 border-x border-dashed border-strong bg-emphasis/70"
            style={{
              left: pct(x0),
              width: pct(x1 - x0),
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent 0 5px, var(--background-color-surface) 5px 7px)',
            }}
          ></div>
        );
      })}
    </div>
  );
}

function RootRow({
  record,
  scale,
  title,
}: {
  record: AttemptRecord;
  scale: WaterfallScale;
  title: ReactNode;
}) {
  return (
    <div className={rowStyles({ type: 'root' })} role="row">
      <div className={labelStyles({ className: 'px-3' })}>
        <RowIcon name={IconName.Invocation} tone="call" />
        <span className="min-w-0 truncate font-medium text-primary">
          {title}
        </span>
      </div>
      <div className="relative z-10 mx-3">
        <span
          className={barStyles({ tone: 'root' })}
          style={barStyle(scale, record.startAt, record.endAt)}
        />
        {record.attempts.map((attempt) => (
          <span
            key={attempt.attempt}
            className={barStyles({
              tone: attemptTone(attempt),
              isRootSegment: true,
            })}
            style={barStyle(scale, attempt.startAt, attempt.endAt)}
          />
        ))}
        <DurationLabel scale={scale} from={record.startAt} to={record.endAt} />
      </div>
    </div>
  );
}

function AttemptRow({
  attempt,
  record,
  scale,
  isExpanded,
  isFocused,
  onFocus,
  onToggle,
}: {
  attempt: Attempt;
  record: AttemptRecord;
  scale: WaterfallScale;
  isExpanded: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onToggle: () => void;
}) {
  const tooltip = (
    <TooltipBody
      title={`Attempt ${attempt.attempt}`}
      lines={[
        causeLabel(attempt, record),
        `started ${formatOffset(attempt.startAt - record.startAt)} after the invocation was created`,
        `${attempt.isRunning ? 'running for' : 'lasted'} ${formatSpan(attempt.endAt - attempt.startAt)}`,
        attempt.ended?.reason ? `ended: ${attempt.ended.reason}` : undefined,
        attempt.ended?.failure?.message,
      ]}
    />
  );
  return (
    <div
      className={rowStyles({ type: 'attempt' })}
      role="row"
      data-attempt-row={attempt.attempt}
    >
      <div className={labelStyles({ className: 'pl-1' })}>
        <Button
          variant="icon"
          onClick={onToggle}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} attempt ${attempt.attempt}`}
          aria-expanded={isExpanded}
          className="h-6 w-6 shrink-0 rounded-md p-0"
        >
          <Icon
            name={isExpanded ? IconName.ChevronDown : IconName.ChevronRight}
            className="h-3.5 w-3.5 text-muted"
          />
        </Button>
        <span className="shrink-0 font-semibold text-primary">
          Attempt {attempt.attempt}
        </span>
        <OutcomeBadge attempt={attempt} size="xs" />
        <span className="min-w-0 flex-1 truncate text-2xs text-muted">
          {causeLabel(attempt, record)}
        </span>
        <HoverTooltip
          content={isFocused ? 'Show every attempt' : 'Zoom to this attempt'}
        >
          <Button
            variant="icon"
            onClick={onFocus}
            aria-label={
              isFocused
                ? 'Show every attempt'
                : `Zoom to attempt ${attempt.attempt}`
            }
            className="h-6 w-6 shrink-0 rounded-md p-0"
          >
            <Icon
              name={isFocused ? IconName.ZoomOut : IconName.ZoomIn}
              className="h-3.5 w-3.5 text-muted"
            />
          </Button>
        </HoverTooltip>
      </div>
      <HoverTooltip
        content={tooltip}
        followCursor
        className="relative z-10 mx-3 h-full"
      >
        <span
          className={barStyles({ tone: attemptTone(attempt) })}
          style={barStyle(scale, attempt.startAt, attempt.endAt)}
        />
        <DurationLabel
          scale={scale}
          from={attempt.startAt}
          to={attempt.endAt}
        />
      </HoverTooltip>
    </div>
  );
}

function NodeRow({
  node,
  attempt,
  depth,
  scale,
}: {
  node: RecordNode;
  attempt: Attempt;
  depth: number;
  scale: WaterfallScale;
}) {
  const label =
    node.type === 'span'
      ? node.name
      : node.type === 'result'
        ? `result #${node.resultId}`
        : actionLabel(node);
  return (
    <div className={rowStyles({ type: 'node' })} role="row">
      <div
        className={labelStyles()}
        style={{ paddingLeft: `${1.75 + depth * 1}rem` }}
      >
        <RowIcon name={actionIcon(node)} tone={nodeTone(node)} />
        <span className="min-w-0 truncate text-tertiary">
          {node.type === 'span' ? (
            <span className="font-medium text-secondary">{label}</span>
          ) : (
            label
          )}
        </span>
        {node.type === 'action' && node.kind === 'AtomicGroup' && (
          <span className="shrink-0 rounded bg-muted px-1 text-2xs text-tertiary">
            {node.members?.length ?? 0} atomic
          </span>
        )}
      </div>
      <HoverTooltip
        content={<NodeTooltip node={node} attempt={attempt} />}
        followCursor
        className="relative z-10 mx-3 h-full"
      >
        <NodeMark node={node} scale={scale} />
      </HoverTooltip>
    </div>
  );
}

function NodeMark({
  node,
  scale,
}: {
  node: RecordNode;
  scale: WaterfallScale;
}) {
  if (node.type === 'span') {
    const tone =
      node.outcome === 'failure'
        ? 'spanFailure'
        : node.endedBy === 'attempt'
          ? 'spanCut'
          : 'span';
    return (
      <>
        <span
          className={barStyles({ tone })}
          style={barStyle(scale, node.startAt, node.endAt)}
        />
        <DurationLabel scale={scale} from={node.startAt} to={node.endAt} />
      </>
    );
  }
  if (node.type === 'result') {
    return (
      <span
        className={markerStyles({ tone: 'default' })}
        style={{ left: pct(scale.x(node.at)) }}
      />
    );
  }
  if (
    node.endAt !== undefined &&
    node.resultId !== undefined &&
    !isSend(node)
  ) {
    const tone =
      node.kind === 'ReadSignal'
        ? 'readSignal'
        : node.result
          ? 'call'
          : 'callOpen';
    return (
      <>
        <span
          className={barStyles({ tone })}
          style={barStyle(scale, node.at, node.endAt)}
        />
        {node.result && (
          <span
            className={markerStyles({
              tone: node.result.variant === 'failure' ? 'danger' : 'call',
            })}
            style={{ left: pct(scale.x(node.result.at)) }}
          />
        )}
        <DurationLabel
          scale={scale}
          from={node.at}
          to={node.endAt}
          suffix={node.result ? undefined : 'no result'}
        />
      </>
    );
  }
  return (
    <span
      className={markerStyles({ tone: markerTone(node) })}
      style={{ left: pct(scale.x(node.at)) }}
    />
  );
}

function markerTone(node: ActionNode) {
  if (node.kind === 'AtomicGroup') {
    return 'group' as const;
  }
  if (isSend(node)) {
    return 'send' as const;
  }
  if (node.kind === 'CancelInvocation') {
    return 'danger' as const;
  }
  return 'default' as const;
}

function DurationLabel({
  scale,
  from,
  to,
  suffix,
}: {
  scale: WaterfallScale;
  from: number;
  to: number;
  suffix?: string;
}) {
  const x0 = scale.x(from);
  const x1 = scale.x(to);
  const text = `${formatSpan(to - from)}${suffix ? ` · ${suffix}` : ''}`;
  const placement = x1 <= 0.86 ? 'after' : x0 >= 0.14 ? 'before' : 'inside';
  return (
    <span
      className={durationStyles({ placement })}
      style={
        placement === 'after'
          ? { left: pct(x1) }
          : placement === 'before'
            ? { right: pct(1 - x0) }
            : { right: pct(1 - x1) }
      }
    >
      {text}
    </span>
  );
}

const durationStyles = tv({
  base: 'pointer-events-none absolute top-1/2 -translate-y-1/2 text-2xs whitespace-nowrap tabular-nums',
  variants: {
    placement: {
      after: 'px-1.5 text-muted',
      before: 'px-1.5 text-muted',
      inside: 'mr-1 rounded bg-surface/85 px-1 text-tertiary',
    },
  },
});

function TooltipBody({
  title,
  lines,
}: {
  title: string;
  lines: (string | undefined)[];
}) {
  return (
    <span className="flex max-w-80 flex-col gap-0.5 text-xs">
      <span className="font-medium text-inverse">{title}</span>
      {lines.filter(Boolean).map((line, index) => (
        <span key={index} className="text-inverse-secondary">
          {line}
        </span>
      ))}
    </span>
  );
}

function NodeTooltip({
  node,
  attempt,
}: {
  node: RecordNode;
  attempt: Attempt;
}) {
  if (node.type === 'span') {
    return (
      <TooltipBody
        title={`Span ${node.name}`}
        lines={[
          `attempt ${attempt.attempt}, ${formatOffset(node.startAt - attempt.startAt)} into it`,
          `${formatSpan(node.endAt - node.startAt)}${node.endedBy === 'attempt' ? ', closed when the attempt ended' : node.endedBy === 'running' ? ', still open' : `, ${node.outcome ?? 'ok'}`}`,
          node.startedInGroup ? 'opened inside an atomic commit' : undefined,
          node.endedInGroup ? 'closed inside an atomic commit' : undefined,
          node.failure?.message,
        ]}
      />
    );
  }
  if (node.type === 'result') {
    return (
      <TooltipBody
        title={`Result #${node.resultId}`}
        lines={[
          `${node.variant ?? 'value'}, ${formatOffset(node.at - attempt.startAt)}`,
        ]}
      />
    );
  }
  const target = node.summary.target;
  return (
    <TooltipBody
      title={actionLabel(node)}
      lines={[
        `${node.kind}, attempt ${attempt.attempt}, ${formatOffset(node.at - attempt.startAt)} into it`,
        target?.service
          ? `${target.service}${target.key ? `/${target.key}` : ''}/${target.handler}`
          : undefined,
        node.summary.key !== undefined
          ? `${node.summary.scope ?? 'object'} state: ${node.summary.key}`
          : undefined,
        node.summary.invocation_id,
        node.result
          ? `${node.result.variant ?? 'result'} after ${formatSpan(node.result.at - node.at)}`
          : node.resultId !== undefined && !isSend(node)
            ? `no result in this attempt (#${node.resultId})`
            : undefined,
        node.members
          ? node.members.map((member) => actionLabel(member)).join(' · ')
          : undefined,
      ]}
    />
  );
}
