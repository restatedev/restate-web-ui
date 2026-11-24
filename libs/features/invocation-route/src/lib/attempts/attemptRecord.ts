export const ATTEMPT_EVENT_TYPES = [
  'AttemptStarted',
  'AttemptEnded',
  'ActionRecorded',
  'SpanStarted',
  'SpanEnded',
  'ResultDelivered',
] as const;

export type AttemptEventType = (typeof ATTEMPT_EVENT_TYPES)[number];

export type AttemptCause = 'first' | 'retry' | 'restart' | 'wake_up' | 'resume';
export type AttemptOutcome =
  | 'returned'
  | 'failed'
  | 'restarted'
  | 'suspended'
  | 'paused'
  | 'killed'
  | 'lost';
export type SpanOutcome = 'ok' | 'value' | 'failure';
export type ResultVariant = 'value' | 'failure' | 'void';

export interface EventFailure {
  code?: number;
  message?: string;
}

export interface WokenBy {
  kind?: 'result' | 'signal' | 'cancel';
  result_id?: number;
  signal_name?: string;
}

export interface OutstandingResult {
  result_id?: number;
  kind?: 'call' | 'attach' | 'signal_read' | string;
  label?: string;
}

export interface ActionTarget {
  service?: string;
  handler?: string;
  key?: string;
}

export interface ActionSummary {
  scope?: 'object' | 'invocation' | string;
  key?: string;
  target?: ActionTarget;
  invocation_id?: string;
  signal_name?: string;
  signal_index?: number;
  bytes?: number;
  span_id?: number;
  outcome?: SpanOutcome;
  failure?: EventFailure;
}

export interface RecordedActionJson {
  kind?: string;
  name?: string;
  parent_span_id?: number;
  result_id?: number;
  invocation_id_result_id?: number;
  level?: 'summary' | 'full' | string;
  summary?: ActionSummary;
  payload?: string;
  members?: RecordedActionJson[];
}

export interface AttemptStartedJson {
  ty: 'AttemptStarted';
  attempt?: number;
  deployment_id?: string;
  protocol_version?: number;
  cause?: AttemptCause | string;
  woken_by?: WokenBy;
}

export interface AttemptEndedJson {
  ty: 'AttemptEnded';
  attempt?: number;
  reason?: string;
  outcome?: AttemptOutcome | string;
  rule?: number;
  failure?: EventFailure;
  outstanding?: OutstandingResult[];
}

export interface ActionRecordedJson extends RecordedActionJson {
  ty: 'ActionRecorded';
  attempt?: number;
}

export interface SpanStartedJson {
  ty: 'SpanStarted';
  attempt?: number;
  span_id?: number;
  parent_span_id?: number;
  name?: string;
}

export interface SpanEndedJson {
  ty: 'SpanEnded';
  attempt?: number;
  span_id?: number;
  outcome?: SpanOutcome;
  value?: string;
  failure?: EventFailure;
}

export interface ResultDeliveredJson {
  ty: 'ResultDelivered';
  attempt?: number;
  result_id?: number;
  variant?: ResultVariant | string;
}

export type AttemptEventJson =
  | AttemptStartedJson
  | AttemptEndedJson
  | ActionRecordedJson
  | SpanStartedJson
  | SpanEndedJson
  | ResultDeliveredJson;

export interface AttemptEventRow {
  appended_at?: string | null;
  event_type?: string | null;
  event_json?: string | null;
}

export interface ParsedAttemptEvent {
  at: number;
  lsn?: number;
  order: number;
  attempt: number;
  event: AttemptEventJson;
}

export interface ActionNode {
  type: 'action';
  key: string;
  attempt: number;
  kind: string;
  name: string;
  at: number;
  parentSpanId?: number;
  resultId?: number;
  invocationIdResultId?: number;
  level?: string;
  summary: ActionSummary;
  payload?: string;
  members?: ActionNode[];
  result?: { at: number; variant?: string };
  endAt?: number;
  isAwaiting: boolean;
}

export interface SpanNode {
  type: 'span';
  key: string;
  attempt: number;
  spanId: number;
  name: string;
  parentSpanId?: number;
  startAt: number;
  endAt: number;
  endedBy: 'span' | 'attempt' | 'running';
  outcome?: SpanOutcome;
  value?: string;
  failure?: EventFailure;
  startedInGroup?: string;
  endedInGroup?: string;
  children: RecordNode[];
}

export interface OrphanResultNode {
  type: 'result';
  key: string;
  attempt: number;
  at: number;
  resultId?: number;
  variant?: string;
}

export type RecordNode = ActionNode | SpanNode | OrphanResultNode;

export interface Attempt {
  attempt: number;
  startAt: number;
  endAt: number;
  isRunning: boolean;
  started?: AttemptStartedJson;
  ended?: AttemptEndedJson;
  nodes: RecordNode[];
  actionCount: number;
  spanCount: number;
}

export type GapKind =
  | 'suspended'
  | 'backoff'
  | 'restart'
  | 'paused'
  | 'lost'
  | 'unknown';

export interface AttemptGap {
  key: string;
  from: number;
  to: number;
  kind: GapKind;
  after: Attempt;
  before?: Attempt;
  isOngoing: boolean;
}

export interface AttemptRecord {
  attempts: Attempt[];
  gaps: AttemptGap[];
  startAt: number;
  endAt: number;
  actionsByResultId: Map<string, ActionNode>;
}

export interface BuildAttemptRecordOptions {
  now?: number;
  createdAt?: string | null;
  completedAt?: string | null;
  isCompleted?: boolean;
}

const KNOWN_EVENT_TYPES = new Set<string>(ATTEMPT_EVENT_TYPES);

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toTime(value?: string | null) {
  if (!value) {
    return undefined;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

export function hasAttemptRecord(rows?: AttemptEventRow[] | null) {
  return Boolean(
    rows?.some(
      (row) =>
        row.event_type === 'AttemptStarted' ||
        row.event_type === 'AttemptEnded',
    ),
  );
}

export function parseAttemptEvents(
  rows: AttemptEventRow[],
): ParsedAttemptEvent[] {
  const parsed: ParsedAttemptEvent[] = [];
  rows.forEach((row, order) => {
    if (!row.event_json) {
      return;
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(row.event_json);
    } catch {
      return;
    }
    if (!json || typeof json !== 'object') {
      return;
    }
    const ty = (json['ty'] as string | undefined) ?? row.event_type ?? '';
    if (!KNOWN_EVENT_TYPES.has(ty)) {
      return;
    }
    const attempt = toNumber(json['attempt']);
    const at = toTime(row.appended_at);
    if (attempt === undefined || at === undefined) {
      return;
    }
    parsed.push({
      at,
      lsn: toNumber(json['lsn']),
      order,
      attempt,
      event: { ...json, ty } as AttemptEventJson,
    });
  });

  return parsed.sort((a, b) => {
    if (a.lsn !== undefined && b.lsn !== undefined && a.lsn !== b.lsn) {
      return a.lsn - b.lsn;
    }
    if (a.at !== b.at) {
      return a.at - b.at;
    }
    return a.order - b.order;
  });
}

function resultKey(attempt: number, resultId: number) {
  return `${attempt}:${resultId}`;
}

class AttemptBuilder {
  readonly nodes: RecordNode[] = [];
  readonly spans = new Map<number, SpanNode>();
  readonly inserted = new Set<SpanNode>();
  readonly results = new Map<number, ActionNode>();
  started?: AttemptStartedJson;
  ended?: AttemptEndedJson;
  startAt?: number;
  endAt?: number;
  firstAt?: number;
  lastAt?: number;
  actionCount = 0;
  spanCount = 0;
  private nextKey = 0;

  constructor(readonly attempt: number) {}

  key(prefix: string) {
    return `a${this.attempt}-${prefix}-${this.nextKey++}`;
  }

  seen(at: number) {
    this.firstAt = this.firstAt === undefined ? at : Math.min(this.firstAt, at);
    this.lastAt = this.lastAt === undefined ? at : Math.max(this.lastAt, at);
  }

  insert(node: RecordNode, parentSpanId?: number) {
    const parent =
      parentSpanId === undefined ? undefined : this.spans.get(parentSpanId);
    if (parent && parent !== node) {
      this.ensureInserted(parent);
      parent.children.push(node);
    } else {
      this.nodes.push(node);
    }
  }

  ensureInserted(span: SpanNode) {
    if (this.inserted.has(span)) {
      return;
    }
    this.inserted.add(span);
    this.insert(span, span.parentSpanId);
  }

  newSpan(
    spanId: number,
    at: number,
    name: string | undefined,
    parentSpanId: number | undefined,
  ): SpanNode {
    this.spanCount++;
    const span: SpanNode = {
      type: 'span',
      key: this.key('span'),
      attempt: this.attempt,
      spanId,
      name: name || `span ${spanId}`,
      parentSpanId,
      startAt: at,
      endAt: at,
      endedBy: 'running',
      children: [],
    };
    this.spans.set(spanId, span);
    return span;
  }

  action(json: RecordedActionJson, at: number, isMember: boolean): ActionNode {
    const node: ActionNode = {
      type: 'action',
      key: this.key(isMember ? 'member' : 'action'),
      attempt: this.attempt,
      kind: json.kind ?? 'Action',
      name: json.name ?? '',
      at,
      parentSpanId: toNumber(json.parent_span_id),
      resultId: toNumber(json.result_id),
      invocationIdResultId: toNumber(json.invocation_id_result_id),
      level: json.level,
      summary: json.summary ?? {},
      payload: json.payload,
      isAwaiting: false,
    };
    if (node.resultId !== undefined) {
      this.results.set(node.resultId, node);
    }
    return node;
  }

  endSpan(
    span: SpanNode,
    at: number,
    outcome: SpanOutcome | undefined,
    value: string | undefined,
    failure: EventFailure | undefined,
  ) {
    span.endAt = at;
    span.endedBy = 'span';
    span.outcome = outcome;
    span.value = value;
    span.failure = failure;
  }

  apply({ at, event }: ParsedAttemptEvent) {
    this.seen(at);
    switch (event.ty) {
      case 'AttemptStarted': {
        this.started =
          event.cause === undefined && this.attempt === 1
            ? { ...event, cause: 'first' }
            : event;
        this.startAt = at;
        return;
      }
      case 'AttemptEnded': {
        this.ended =
          event.outcome === undefined
            ? { ...event, outcome: inferOutcome(event.reason) }
            : event;
        this.endAt = at;
        return;
      }
      case 'SpanStarted': {
        const spanId = toNumber(event.span_id);
        if (spanId === undefined) {
          return;
        }
        const span = this.newSpan(
          spanId,
          at,
          event.name,
          toNumber(event.parent_span_id),
        );
        this.ensureInserted(span);
        return;
      }
      case 'SpanEnded': {
        const spanId = toNumber(event.span_id);
        if (spanId === undefined) {
          return;
        }
        let span = this.spans.get(spanId);
        if (!span) {
          span = this.newSpan(spanId, this.startAt ?? at, undefined, undefined);
          this.ensureInserted(span);
        }
        this.endSpan(span, at, event.outcome, event.value, event.failure);
        return;
      }
      case 'ActionRecorded': {
        this.actionCount++;
        const node = this.action(event, at, false);
        const groupSpans: SpanNode[] = [];
        if (Array.isArray(event.members)) {
          node.members = event.members.map((member) => {
            const memberNode = this.action(member, at, true);
            const spanId = toNumber(memberNode.summary.span_id);
            if (memberNode.kind === 'SpanStart' && spanId !== undefined) {
              const span = this.newSpan(
                spanId,
                at,
                memberNode.name,
                memberNode.parentSpanId,
              );
              span.startedInGroup = node.key;
              groupSpans.push(span);
            } else if (memberNode.kind === 'SpanEnd' && spanId !== undefined) {
              const span = this.spans.get(spanId);
              if (span) {
                this.endSpan(
                  span,
                  at,
                  memberNode.summary.outcome,
                  memberNode.payload,
                  memberNode.summary.failure,
                );
                span.endedInGroup = node.key;
              }
            }
            return memberNode;
          });
        }
        this.insert(node, node.parentSpanId);
        for (const span of groupSpans) {
          if (span.endedInGroup !== node.key) {
            this.ensureInserted(span);
          }
        }
        return;
      }
      case 'ResultDelivered': {
        const resultId = toNumber(event.result_id);
        const target =
          resultId === undefined ? undefined : this.results.get(resultId);
        if (target) {
          target.result = { at, variant: event.variant };
        } else {
          this.insert({
            type: 'result',
            key: this.key('result'),
            attempt: this.attempt,
            at,
            resultId,
            variant: event.variant,
          });
        }
        return;
      }
    }
  }

  finish(isRunning: boolean, now: number): Attempt {
    const startAt = this.startAt ?? this.firstAt ?? now;
    const endAt = this.ended
      ? (this.endAt ?? startAt)
      : isRunning
        ? Math.max(now, this.lastAt ?? startAt)
        : (this.lastAt ?? startAt);

    for (const span of this.spans.values()) {
      if (span.endedBy === 'running') {
        span.endAt = endAt;
        span.endedBy = isRunning ? 'running' : 'attempt';
      }
    }
    for (const node of this.results.values()) {
      if (node.kind === 'Call' || node.kind === 'AttachInvocation') {
        node.endAt = node.result?.at ?? endAt;
      } else if (node.result) {
        node.endAt = node.result.at;
      } else if (node.kind === 'ReadSignal') {
        node.endAt = endAt;
      }
      node.isAwaiting = isRunning && !node.result && node.endAt !== undefined;
    }

    return {
      attempt: this.attempt,
      startAt,
      endAt: Math.max(endAt, startAt),
      isRunning,
      started: this.started,
      ended: this.ended,
      nodes: this.nodes,
      actionCount: this.actionCount,
      spanCount: this.spanCount,
    };
  }
}

export function inferOutcome(reason?: string): AttemptOutcome | undefined {
  const text = reason?.toLowerCase().trim() ?? '';
  if (text === 'end' || text.startsWith('end ')) {
    return 'returned';
  }
  if (text.includes('suspend')) {
    return 'suspended';
  }
  if (text.includes('restart')) {
    return 'restarted';
  }
  if (text.includes('pause')) {
    return 'paused';
  }
  if (text.includes('kill')) {
    return 'killed';
  }
  if (text.includes('error') || text.includes('fail')) {
    return 'failed';
  }
  return undefined;
}

function gapKind(outcome?: string): GapKind {
  switch (outcome) {
    case 'suspended':
      return 'suspended';
    case 'failed':
      return 'backoff';
    case 'restarted':
      return 'restart';
    case 'paused':
      return 'paused';
    case 'lost':
      return 'lost';
    default:
      return 'unknown';
  }
}

const TERMINAL_OUTCOMES = new Set(['returned', 'killed']);

export function buildAttemptRecord(
  rows: AttemptEventRow[],
  options: BuildAttemptRecordOptions = {},
): AttemptRecord {
  const now = options.now ?? Date.now();
  const events = parseAttemptEvents(rows);
  const builders = new Map<number, AttemptBuilder>();
  for (const event of events) {
    let builder = builders.get(event.attempt);
    if (!builder) {
      builder = new AttemptBuilder(event.attempt);
      builders.set(event.attempt, builder);
    }
    builder.apply(event);
  }

  const sorted = [...builders.values()].sort((a, b) => a.attempt - b.attempt);
  const attempts = sorted.map((builder, index) => {
    const isLast = index === sorted.length - 1;
    const isRunning = isLast && !builder.ended && !options.isCompleted;
    return builder.finish(isRunning, now);
  });

  const actionsByResultId = new Map<string, ActionNode>();
  for (const builder of sorted) {
    for (const [resultId, node] of builder.results) {
      actionsByResultId.set(resultKey(builder.attempt, resultId), node);
    }
  }

  const gaps: AttemptGap[] = [];
  attempts.forEach((attempt, index) => {
    const next = attempts[index + 1];
    if (next) {
      gaps.push({
        key: `gap-${attempt.attempt}`,
        from: attempt.endAt,
        to: Math.max(next.startAt, attempt.endAt),
        kind: gapKind(attempt.ended?.outcome),
        after: attempt,
        before: next,
        isOngoing: false,
      });
    } else if (
      attempt.ended &&
      !options.isCompleted &&
      !TERMINAL_OUTCOMES.has(String(attempt.ended.outcome))
    ) {
      gaps.push({
        key: `gap-${attempt.attempt}`,
        from: attempt.endAt,
        to: Math.max(now, attempt.endAt),
        kind: gapKind(attempt.ended.outcome),
        after: attempt,
        isOngoing: true,
      });
    }
  });

  const firstStart = attempts[0]?.startAt ?? now;
  const createdAt = toTime(options.createdAt);
  const completedAt = toTime(options.completedAt);
  const lastEnd = Math.max(
    attempts.at(-1)?.endAt ?? firstStart,
    gaps.at(-1)?.to ?? firstStart,
  );
  const startAt = Math.min(createdAt ?? firstStart, firstStart);
  const endAt = Math.max(completedAt ?? lastEnd, lastEnd);

  return { attempts, gaps, startAt, endAt, actionsByResultId };
}

export function findActionByResultId(
  record: AttemptRecord,
  resultId: number | undefined,
  beforeAttempt: number,
) {
  if (resultId === undefined) {
    return undefined;
  }
  for (let attempt = beforeAttempt - 1; attempt >= 1; attempt--) {
    const node = record.actionsByResultId.get(resultKey(attempt, resultId));
    if (node) {
      return node;
    }
  }
  return undefined;
}

export function walkNodes(
  nodes: RecordNode[],
  visit: (node: RecordNode, depth: number) => void,
  depth = 0,
) {
  for (const node of nodes) {
    visit(node, depth);
    if (node.type === 'span') {
      walkNodes(node.children, visit, depth + 1);
    }
  }
}
