import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { DateTooltip } from '@restate/ui-tooltip';
import { formatCompactTime } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import { Disclosure, DisclosurePanel, Heading } from 'react-aria-components';
import type {
  ActionNode,
  Attempt,
  AttemptGap,
  AttemptRecord,
  OrphanResultNode,
  RecordNode,
  SpanNode,
} from './attemptRecord';
import {
  ActionSubject,
  FailureText,
  GAP_LABEL,
  OutcomeBadge,
  RULE_TEXT,
  RowIcon,
  actionIcon,
  actionVerb,
  causeIcon,
  causeLabel,
  formatOffset,
  formatSpan,
  gapDescription,
  isSend,
  nodeTone,
} from './AttemptParts';

const cardStyles = tv({
  base: 'group/attempt min-w-0 overflow-hidden rounded-xl border bg-surface shadow-[0_1px_3px_--theme(--box-shadow-color-default/4%)]',
  variants: {
    isRunning: {
      true: 'border-info/40',
      false: 'border-default',
    },
  },
});

const headerStyles = tv({
  base: 'relative flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2.5 pr-10 pl-3 text-xs group-expanded/attempt:border-b group-expanded/attempt:border-muted',
});

const numberStyles = tv({
  base: 'inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border px-1.5 text-sm font-semibold tabular-nums shadow-xs',
  variants: {
    isRunning: {
      true: 'border-info-strong/20 bg-info-subtle text-info-strong',
      false: 'border-default bg-subtle text-secondary',
    },
  },
});

const COLUMN_OFFSET =
  'w-16 shrink-0 text-right text-2xs text-muted tabular-nums';
const COLUMN_STATUS = 'flex w-52 shrink-0 justify-end whitespace-nowrap';

export function AttemptList({
  record,
  expanded,
  onExpandedChange,
}: {
  record: AttemptRecord;
  expanded: Set<number>;
  onExpandedChange: (attempt: number, isExpanded: boolean) => void;
}) {
  const gapAfter = new Map(record.gaps.map((gap) => [gap.after.attempt, gap]));
  return (
    <ol className="flex flex-col" aria-label="Attempts">
      {record.attempts.map((attempt) => {
        const gap = gapAfter.get(attempt.attempt);
        return (
          <li key={attempt.attempt} className="flex flex-col">
            <AttemptCard
              attempt={attempt}
              record={record}
              isExpanded={expanded.has(attempt.attempt)}
              onExpandedChange={(isExpanded) =>
                onExpandedChange(attempt.attempt, isExpanded)
              }
            />
            {gap && <GapConnector gap={gap} record={record} />}
          </li>
        );
      })}
    </ol>
  );
}

function AttemptCard({
  attempt,
  record,
  isExpanded,
  onExpandedChange,
}: {
  attempt: Attempt;
  record: AttemptRecord;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
}) {
  const duration = attempt.endAt - attempt.startAt;
  const ended = attempt.ended;
  const rule = ended?.rule;
  const outstanding = ended?.outstanding ?? [];
  return (
    <Disclosure
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      className={cardStyles({ isRunning: attempt.isRunning })}
      data-attempt={attempt.attempt}
    >
      <div className={headerStyles()}>
        <Heading className="absolute inset-0 z-0">
          <Button
            slot="trigger"
            variant="icon"
            aria-label={`Attempt ${attempt.attempt}`}
            className="relative h-full w-full justify-end rounded-none py-0 pr-3 pl-0 hover:bg-tint-subtle pressed:bg-tint"
          >
            <Icon
              name={IconName.ChevronDown}
              className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-expanded/attempt:rotate-180"
            />
          </Button>
        </Heading>
        <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className={numberStyles({ isRunning: attempt.isRunning })}>
            {attempt.attempt}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary">
              Attempt {attempt.attempt}
              <OutcomeBadge attempt={attempt} />
            </span>
            <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
              <Icon
                name={causeIcon(attempt)}
                className="h-3 w-3 shrink-0 text-subtle"
              />
              <span className="truncate">{causeLabel(attempt, record)}</span>
            </span>
          </span>
          <span className="pointer-events-auto ml-auto flex shrink-0 items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-subtle">
                {attempt.started ? 'at' : 'ended at'}
              </span>
              <DateTooltip
                date={
                  new Date(attempt.started ? attempt.startAt : attempt.endAt)
                }
                title={attempt.started ? 'Started' : 'Ended'}
              >
                <span className="font-medium text-tertiary tabular-nums">
                  {formatTime(
                    attempt.started ? attempt.startAt : attempt.endAt,
                  )}
                </span>
              </DateTooltip>
            </span>
            {attempt.started && (
              <span className="inline-flex items-baseline gap-1">
                <span className="text-subtle">
                  {attempt.isRunning ? 'running for' : 'lasted'}
                </span>
                <span className="font-medium text-tertiary tabular-nums">
                  {formatSpan(duration)}
                </span>
              </span>
            )}
            <Badge size="xs" className="tabular-nums">
              {attempt.actionCount}{' '}
              {attempt.actionCount === 1 ? 'action' : 'actions'}
            </Badge>
          </span>
        </div>
      </div>
      {(ended?.reason || rule !== undefined || ended?.failure) && (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-muted bg-subtle/60 px-3 py-1.5 text-xs group-[:not([data-expanded])]/attempt:border-b-0">
          {ended?.reason && (
            <span className="inline-flex min-w-0 items-baseline gap-1.5">
              <span className="text-subtle">Ended:</span>
              <span className="truncate text-tertiary">{ended.reason}</span>
            </span>
          )}
          {rule !== undefined && (
            <span className="inline-flex min-w-0 items-baseline gap-1.5">
              <span className="text-subtle">Rule {rule}:</span>
              <span className="text-tertiary">
                {RULE_TEXT[rule] ?? 'see spec §10.5'}
              </span>
            </span>
          )}
          <FailureText failure={ended?.failure} />
        </div>
      )}
      <DisclosurePanel>
        <div className="px-2 py-2">
          {attempt.nodes.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-subtle">
              {attempt.started
                ? 'No recorded actions in this attempt.'
                : 'This attempt ended before the handler started: nothing ran.'}
            </p>
          ) : (
            <NodeList nodes={attempt.nodes} attempt={attempt} />
          )}
          {outstanding.length > 0 && (
            <div className="mx-1 mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-strong bg-subtle px-2.5 py-1.5 text-xs">
              <Icon name={IconName.Timer} className="h-3.5 w-3.5 text-subtle" />
              <span className="text-muted">Waiting on</span>
              {outstanding.map((item, index) => (
                <Badge
                  key={`${item.result_id ?? 'x'}-${index}`}
                  size="xs"
                  className="gap-1"
                >
                  <span className="text-subtle">
                    {item.kind === 'signal_read' ? 'signal' : item.kind}
                  </span>
                  <span className="font-medium text-secondary">
                    {item.label}
                  </span>
                  {item.result_id !== undefined && (
                    <span className="font-mono text-subtle">
                      #{item.result_id}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function formatTime(time: number) {
  const date = new Date(time);
  const base = formatCompactTime(date);
  return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function NodeList({
  nodes,
  attempt,
}: {
  nodes: RecordNode[];
  attempt: Attempt;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <li key={node.key} className="flex flex-col">
          {node.type === 'span' ? (
            <SpanRow span={node} attempt={attempt} />
          ) : node.type === 'result' ? (
            <OrphanResultRow node={node} attempt={attempt} />
          ) : (
            <ActionRow node={node} attempt={attempt} />
          )}
        </li>
      ))}
    </ul>
  );
}

const rowStyles = tv({
  base: 'flex min-h-8 min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-tint-subtle',
});

function SpanRow({ span, attempt }: { span: SpanNode; attempt: Attempt }) {
  return (
    <>
      <div className={rowStyles()}>
        <RowIcon name={actionIcon(span)} tone={nodeTone(span)} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
            span
          </span>
          <span className="truncate text-sm font-medium text-primary">
            {span.name}
          </span>
          {span.startedInGroup && (
            <Badge size="xs" className="gap-1">
              <Icon name={IconName.Layers} className="h-3 w-3" />
              opened in a commit
            </Badge>
          )}
          {span.value !== undefined && (
            <span className="max-w-64 truncate font-mono text-2xs text-tertiary">
              = {span.value}
            </span>
          )}
          <FailureText failure={span.failure} />
        </span>
        <span className={COLUMN_OFFSET}>
          {formatOffset(span.startAt - attempt.startAt)}
        </span>
        <span className={COLUMN_STATUS}>
          <SpanStatus span={span} />
        </span>
      </div>
      {span.children.length > 0 && (
        <div className="ml-4 border-l border-accent/25 pl-2">
          <NodeList nodes={span.children} attempt={attempt} />
        </div>
      )}
    </>
  );
}

function SpanStatus({ span }: { span: SpanNode }) {
  const duration = formatSpan(span.endAt - span.startAt);
  if (span.endedBy === 'running') {
    return (
      <Badge size="xs" variant="info">
        open · {duration}
      </Badge>
    );
  }
  if (span.endedBy === 'attempt') {
    return (
      <Badge size="xs" className="border-dashed">
        {duration} · closed at attempt end
      </Badge>
    );
  }
  return (
    <Badge
      size="xs"
      variant={span.outcome === 'failure' ? 'danger' : 'success'}
      className="tabular-nums"
    >
      {span.outcome ?? 'ok'} · {duration}
    </Badge>
  );
}

function ActionRow({ node, attempt }: { node: ActionNode; attempt: Attempt }) {
  const isGroup = node.kind === 'AtomicGroup';
  return (
    <>
      <div className={rowStyles()}>
        <RowIcon name={actionIcon(node)} tone={nodeTone(node)} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-xs font-medium text-secondary">
            {actionVerb(node)}
          </span>
          {node.name && (
            <span className="truncate text-xs text-tertiary">
              “{node.name}”
            </span>
          )}
          {isGroup ? (
            <span className="text-2xs text-muted">
              {node.members?.length ?? 0}{' '}
              {node.members?.length === 1 ? 'action' : 'actions'}
            </span>
          ) : (
            <ActionSubject node={node} />
          )}
        </span>
        <span className={COLUMN_OFFSET}>
          {formatOffset(node.at - attempt.startAt)}
        </span>
        <span className={COLUMN_STATUS}>
          <ActionStatus node={node} attempt={attempt} />
        </span>
      </div>
      {node.payload !== undefined && !isGroup && (
        <Payload value={node.payload} />
      )}
      {isGroup && node.members && node.members.length > 0 && (
        <ul className="mt-0.5 mb-1 ml-[1.1rem] flex flex-col rounded-lg border border-tint bg-category-2/5 py-1 pr-1 pl-2">
          {node.members.map((member) => (
            <li key={member.key} className="flex flex-col">
              <MemberRow node={member} attempt={attempt} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MemberRow({ node, attempt }: { node: ActionNode; attempt: Attempt }) {
  const isSpanMarker = node.kind === 'SpanStart' || node.kind === 'SpanEnd';
  return (
    <>
      <div className="flex min-h-7 min-w-0 items-center gap-2 rounded-md px-1 py-0.5 hover:bg-tint-subtle">
        <span className="h-px w-2 shrink-0 bg-strong" />
        <RowIcon
          name={actionIcon(node)}
          tone={isSpanMarker ? 'span' : nodeTone(node)}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-xs font-medium text-secondary">
            {actionVerb(node)}
          </span>
          {node.name && (
            <span className="truncate text-xs text-tertiary">
              “{node.name}”
            </span>
          )}
          {isSpanMarker ? (
            <>
              {node.summary.span_id !== undefined && (
                <span className="font-mono text-2xs text-subtle">
                  span {node.summary.span_id}
                </span>
              )}
              {node.summary.outcome && (
                <Badge
                  size="xs"
                  variant={
                    node.summary.outcome === 'failure' ? 'danger' : 'success'
                  }
                >
                  {node.summary.outcome}
                </Badge>
              )}
              <FailureText failure={node.summary.failure} />
            </>
          ) : (
            <ActionSubject node={node} />
          )}
        </span>
        <span className={COLUMN_STATUS}>
          <ActionStatus node={node} attempt={attempt} />
        </span>
      </div>
      {node.payload !== undefined && <Payload value={node.payload} />}
    </>
  );
}

function Payload({ value }: { value: string }) {
  return (
    <pre
      title={value}
      className="mt-0.5 mb-1 ml-9 line-clamp-3 rounded-md border border-inset bg-inset px-2 py-1 font-mono text-2xs break-all whitespace-pre-wrap text-tertiary shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]"
    >
      {value}
    </pre>
  );
}

function ActionStatus({
  node,
  attempt,
}: {
  node: ActionNode;
  attempt: Attempt;
}) {
  if (node.kind === 'AtomicGroup') {
    return (
      <Badge size="xs" className="gap-1">
        <Icon name={IconName.Check} className="h-3 w-3" />
        applied, all or none
      </Badge>
    );
  }
  if (isSend(node)) {
    return (
      <Badge size="xs" className="gap-1">
        <Icon name={IconName.ArrowUpRight} className="h-3 w-3" />
        sent, not awaited
      </Badge>
    );
  }
  if (node.result) {
    const took = formatSpan(node.result.at - node.at);
    return (
      <Badge
        size="xs"
        variant={node.result.variant === 'failure' ? 'danger' : 'success'}
        className="tabular-nums"
      >
        {node.result.variant === 'failure'
          ? 'failure'
          : node.result.variant === 'void'
            ? 'done'
            : 'result'}{' '}
        in {took}
      </Badge>
    );
  }
  if (node.resultId !== undefined && node.endAt !== undefined) {
    if (attempt.isRunning) {
      return (
        <Badge size="xs" variant="info" className="gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info-vivid" />
          waiting · #{node.resultId}
        </Badge>
      );
    }
    return (
      <Badge size="xs" className="border-dashed">
        no result in this attempt · #{node.resultId}
      </Badge>
    );
  }
  return null;
}

function OrphanResultRow({
  node,
  attempt,
}: {
  node: OrphanResultNode;
  attempt: Attempt;
}) {
  return (
    <div className={rowStyles()}>
      <RowIcon name={actionIcon(node)} />
      <span className="flex-1 text-xs text-tertiary">
        result #{node.resultId} delivered
      </span>
      <span className={COLUMN_OFFSET}>
        {formatOffset(node.at - attempt.startAt)}
      </span>
      <span className={COLUMN_STATUS}>
        <Badge size="xs">{node.variant ?? 'value'}</Badge>
      </span>
    </div>
  );
}

const gapStyles = tv({
  base: 'ml-[1.6rem] flex min-h-12 items-center gap-2 border-l-2 border-dashed py-2 pl-4 text-xs',
  variants: {
    kind: {
      suspended: 'border-strong',
      backoff: 'border-warning/50',
      restart: 'border-warning/50',
      paused: 'border-warning/50',
      lost: 'border-warning/50',
      unknown: 'border-strong',
    },
  },
});

function GapConnector({
  gap,
  record,
}: {
  gap: AttemptGap;
  record: AttemptRecord;
}) {
  const description = gapDescription(gap, record);
  return (
    <div className={gapStyles({ kind: gap.kind })} data-gap={gap.kind}>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-default bg-surface px-2 py-0.5 font-medium text-tertiary shadow-xs">
        <Icon
          name={gap.kind === 'suspended' ? IconName.Pause : IconName.Timer}
          className="h-3 w-3 text-subtle"
        />
        {GAP_LABEL[gap.kind]}
        <span className="font-normal text-muted tabular-nums">
          {gap.isOngoing ? 'for ' : ''}
          {formatSpan(gap.to - gap.from)}
          {gap.isOngoing ? ' so far' : ''}
        </span>
      </span>
      {description && (
        <span className="min-w-0 truncate text-muted">{description}</span>
      )}
    </div>
  );
}
