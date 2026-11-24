import { InvocationId } from '@restate/features-invocation-ui';
import { Target } from '@restate/features-service-target';
import { Badge } from '@restate/ui-badge';
import { Icon, IconName } from '@restate/ui-icons';
import { formatBytes, formatMilliseconds } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { ReactNode } from 'react';
import {
  type ActionNode,
  type Attempt,
  type AttemptGap,
  type AttemptRecord,
  type EventFailure,
  type RecordNode,
  findActionByResultId,
} from './attemptRecord';

export const RULE_TEXT: Record<number, string> = {
  1: 'shut down for a reason other than inactivity',
  2: 'the SDK did not answer the shutdown',
  3: 'the SDK had not processed every notification',
  4: 'the SDK sent a message after the shutdown',
  5: 'no external result was outstanding',
  6: 'silent while waiting on an external result',
};

export function formatOffset(ms: number) {
  return `+${formatMilliseconds(Math.max(0, Math.round(ms)))}`;
}

export function formatSpan(ms: number) {
  return formatMilliseconds(Math.max(0, Math.round(ms)));
}

const KIND_VERBS: Record<string, string> = {
  SetState: 'set',
  ClearState: 'clear',
  ClearAllState: 'clear all',
  GetState: 'get',
  GetStateKeys: 'list keys',
  Call: 'call',
  AttachInvocation: 'attach',
  CancelInvocation: 'cancel',
  ReadSignal: 'read signal',
  SendSignal: 'send signal',
  AtomicGroup: 'commit',
  Flush: 'flush',
  SpanStart: 'open span',
  SpanEnd: 'close span',
};

export function isSend(node: ActionNode) {
  return node.kind === 'Call' && node.resultId === undefined;
}

export function actionVerb(node: ActionNode) {
  if (isSend(node)) {
    return 'send';
  }
  return KIND_VERBS[node.kind] ?? node.kind;
}

export function actionIcon(node: RecordNode): IconName {
  if (node.type === 'span') {
    return IconName.ListTree;
  }
  if (node.type === 'result') {
    return IconName.CornerDownRight;
  }
  switch (node.kind) {
    case 'SetState':
    case 'ClearState':
    case 'ClearAllState':
    case 'GetState':
    case 'GetStateKeys':
      return IconName.Database;
    case 'Call':
      return isSend(node) ? IconName.ArrowUpRight : IconName.Invocation;
    case 'AttachInvocation':
      return IconName.Connect;
    case 'CancelInvocation':
      return IconName.Cancel;
    case 'ReadSignal':
    case 'SendSignal':
      return IconName.Radio;
    case 'AtomicGroup':
      return IconName.Layers;
    case 'SpanStart':
    case 'SpanEnd':
      return IconName.ListTree;
    case 'Flush':
      return IconName.Check;
    default:
      return IconName.Circle;
  }
}

export function targetString(node: ActionNode) {
  const target = node.summary.target;
  if (!target?.service || !target.handler) {
    return undefined;
  }
  return target.key !== undefined && target.key !== null
    ? `${target.service}/${target.key}/${target.handler}`
    : `${target.service}/${target.handler}`;
}

export function actionLabel(node: ActionNode) {
  const target = targetString(node);
  const parts = [actionVerb(node)];
  if (node.name) {
    parts.push(`“${node.name}”`);
  } else if (target) {
    parts.push(target);
  } else if (node.summary.key) {
    parts.push(node.summary.key);
  } else if (node.summary.signal_name) {
    parts.push(node.summary.signal_name);
  }
  return parts.join(' ');
}

const scopeStyles = tv({
  base: 'inline-flex shrink-0 items-center rounded px-1 py-px font-sans text-2xs leading-4 font-medium',
  variants: {
    scope: {
      object: 'bg-category-3/15 text-tertiary',
      invocation: 'bg-category-5/15 text-tertiary',
      other: 'bg-muted text-tertiary',
    },
  },
});

export function ActionSubject({
  node,
  compact = false,
}: {
  node: ActionNode;
  compact?: boolean;
}) {
  const { summary } = node;
  const target = targetString(node);
  const items: ReactNode[] = [];

  if (summary.scope || summary.key !== undefined) {
    items.push(
      <span key="key" className="inline-flex min-w-0 items-center gap-1">
        {summary.scope && (
          <span
            className={scopeStyles({
              scope:
                summary.scope === 'object' || summary.scope === 'invocation'
                  ? summary.scope
                  : 'other',
            })}
          >
            {summary.scope === 'invocation'
              ? 'invocation state'
              : 'object state'}
          </span>
        )}
        {summary.key !== undefined && (
          <span className="truncate font-mono text-xs text-secondary">
            {summary.key}
          </span>
        )}
      </span>,
    );
  }
  if (target) {
    items.push(
      <Target
        key="target"
        target={target}
        className="min-w-0 shrink text-2xs"
      />,
    );
  }
  if (summary.signal_name) {
    items.push(
      <span key="signal" className="font-mono text-xs text-secondary">
        {summary.signal_name}
        {summary.signal_index !== undefined && (
          <span className="text-muted">#{summary.signal_index}</span>
        )}
      </span>,
    );
  }
  if (typeof summary.bytes === 'number' && !compact) {
    items.push(
      <span key="bytes" className="shrink-0 text-2xs text-muted tabular-nums">
        {formatBytes(summary.bytes)}
      </span>,
    );
  }
  if (summary.invocation_id && !compact) {
    items.push(
      <span key="invocation" className="inline-flex w-60 max-w-full min-w-0">
        <InvocationId id={summary.invocation_id} size="sm" />
      </span>,
    );
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {items}
    </span>
  );
}

export function FailureText({ failure }: { failure?: EventFailure }) {
  if (!failure) {
    return null;
  }
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-xs text-danger">
      {failure.code !== undefined && (
        <span className="shrink-0 rounded bg-danger-subtle px-1 font-mono text-2xs text-danger-strong">
          {failure.code}
        </span>
      )}
      <span className="min-w-0 truncate">{failure.message}</span>
    </span>
  );
}

const outcomeStyles = tv({
  base: 'shrink-0 gap-1 whitespace-nowrap',
  variants: {
    outcome: {
      returned: '',
      failed: '',
      restarted: '',
      suspended:
        'border-dashed border-neutral/60 bg-emphasis/40 text-secondary',
      paused: '',
      killed: '',
      lost: '',
      running: '',
      unknown: '',
    },
  },
});

type OutcomeKey =
  | 'returned'
  | 'failed'
  | 'restarted'
  | 'suspended'
  | 'paused'
  | 'killed'
  | 'lost'
  | 'running'
  | 'unknown';

const OUTCOME_VARIANT: Record<
  OutcomeKey,
  'success' | 'danger' | 'info' | 'warning' | 'default'
> = {
  returned: 'success',
  failed: 'danger',
  restarted: 'warning',
  suspended: 'default',
  paused: 'warning',
  killed: 'danger',
  lost: 'warning',
  running: 'info',
  unknown: 'default',
};

const OUTCOME_LABEL: Record<OutcomeKey, string> = {
  returned: 'Returned',
  failed: 'Failed',
  restarted: 'Restarted',
  suspended: 'Suspended',
  paused: 'Paused',
  killed: 'Killed',
  lost: 'Lost',
  running: 'Running',
  unknown: 'Ended',
};

export function outcomeKey(attempt: Attempt): OutcomeKey {
  if (attempt.isRunning) {
    return 'running';
  }
  const outcome = attempt.ended?.outcome;
  if (outcome && outcome in OUTCOME_LABEL) {
    return outcome as OutcomeKey;
  }
  return 'unknown';
}

export function OutcomeBadge({
  attempt,
  size = 'sm',
}: {
  attempt: Attempt;
  size?: 'sm' | 'xs';
}) {
  const key = outcomeKey(attempt);
  const returnedFailure = key === 'returned' && attempt.ended?.failure;
  const rule = attempt.ended?.rule;
  return (
    <Badge
      size={size}
      variant={returnedFailure ? 'danger' : OUTCOME_VARIANT[key]}
      className={outcomeStyles({ outcome: key })}
    >
      {key === 'running' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info-vivid" />
      )}
      {returnedFailure ? 'Returned a failure' : OUTCOME_LABEL[key]}
      {rule !== undefined && (
        <span className="font-normal opacity-80">· rule {rule}</span>
      )}
    </Badge>
  );
}

export function wokenByLabel(attempt: Attempt, record: AttemptRecord) {
  const woken = attempt.started?.woken_by;
  if (!woken) {
    return 'Woken up';
  }
  switch (woken.kind) {
    case 'cancel':
      return 'Woken by the cancel signal';
    case 'signal':
      return woken.signal_name
        ? `Woken by signal ${woken.signal_name}`
        : 'Woken by a signal';
    case 'result': {
      const action = findActionByResultId(
        record,
        woken.result_id,
        attempt.attempt,
      );
      if (action) {
        return `Woken by the result of ${actionLabel(action)} (attempt ${action.attempt}, #${woken.result_id})`;
      }
      return woken.result_id !== undefined
        ? `Woken by result #${woken.result_id}`
        : 'Woken by a result';
    }
    default:
      return 'Woken up';
  }
}

export function causeLabel(attempt: Attempt, record: AttemptRecord) {
  const cause = attempt.started?.cause;
  if (!attempt.started) {
    return 'Start not recorded';
  }
  switch (cause) {
    case 'first':
      return 'First attempt';
    case 'retry':
      return 'Retry';
    case 'restart':
      return 'Restart';
    case 'wake_up':
      return wokenByLabel(attempt, record);
    case 'resume':
      return 'Resumed by an operator';
    default:
      return 'Started';
  }
}

export function causeIcon(attempt: Attempt): IconName {
  switch (attempt.started?.cause) {
    case 'first':
      return IconName.Play;
    case 'retry':
      return IconName.Retry;
    case 'restart':
      return IconName.Restart;
    case 'wake_up':
      return IconName.Resume;
    case 'resume':
      return IconName.Resume;
    default:
      return IconName.CircleDashed;
  }
}

export const GAP_LABEL: Record<AttemptGap['kind'], string> = {
  suspended: 'Suspended',
  backoff: 'Backing off',
  restart: 'Restarting',
  paused: 'Paused',
  lost: 'Restarting after a lost attempt',
  unknown: 'Between attempts',
};

export function gapDescription(gap: AttemptGap, record: AttemptRecord) {
  const outstanding = gap.after.ended?.outstanding ?? [];
  const parts: string[] = [];
  if (gap.kind === 'suspended' && outstanding.length > 0) {
    parts.push(
      `waiting on ${outstanding
        .map(
          (item) =>
            `${item.kind === 'signal_read' ? 'signal' : (item.kind ?? 'result')} ${item.label ?? ''}${item.result_id !== undefined ? ` (#${item.result_id})` : ''}`,
        )
        .join(', ')}`,
    );
  }
  if (gap.before?.started?.cause === 'wake_up') {
    parts.push(wokenByLabel(gap.before, record).toLowerCase());
  } else if (gap.before?.started?.cause === 'resume') {
    parts.push('resumed by an operator');
  }
  return parts.join(' · ');
}

export function RowIcon({
  name,
  tone = 'default',
}: {
  name: IconName;
  tone?: 'default' | 'span' | 'group' | 'call' | 'danger';
}) {
  return (
    <span className={rowIconStyles({ tone })}>
      <Icon name={name} className="h-3 w-3" />
    </span>
  );
}

const rowIconStyles = tv({
  base: 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border shadow-xs',
  variants: {
    tone: {
      default: 'border-default bg-surface text-muted',
      span: 'border-accent/20 bg-accent-subtle text-accent',
      group: 'border-tint bg-category-2/15 text-tertiary',
      call: 'border-info-strong/15 bg-info-subtle text-info-strong',
      danger: 'border-danger-strong/15 bg-danger-subtle text-danger-strong',
    },
  },
});

export function nodeTone(
  node: RecordNode,
): 'default' | 'span' | 'group' | 'call' | 'danger' {
  if (node.type === 'span') {
    return node.outcome === 'failure' ? 'danger' : 'span';
  }
  if (node.type === 'result') {
    return 'default';
  }
  if (node.kind === 'AtomicGroup') {
    return 'group';
  }
  if (
    node.kind === 'Call' ||
    node.kind === 'AttachInvocation' ||
    node.kind === 'ReadSignal'
  ) {
    return 'call';
  }
  return 'default';
}
