import { ATTEMPT_FIXTURES, type AttemptFixture } from './attemptFixtures';
import {
  type ActionNode,
  type AttemptEventRow,
  type SpanNode,
  buildAttemptRecord,
  findActionByResultId,
  hasAttemptRecord,
  parseAttemptEvents,
} from './attemptRecord';
import { buildWaterfallScale } from './waterfallScale';

function fixture(id: string): AttemptFixture {
  const found = ATTEMPT_FIXTURES.find((item) => item.id === id);
  if (!found) {
    throw new Error(id);
  }
  return found;
}

function build(item: AttemptFixture) {
  return buildAttemptRecord(item.rows, {
    now: Date.parse(item.now),
    createdAt: item.invocation.created_at,
    completedAt: item.invocation.completed_at,
    isCompleted: Boolean(item.invocation.completed_at),
  });
}

function row(
  appended_at: string,
  event: Record<string, unknown>,
): AttemptEventRow {
  return {
    appended_at,
    event_type: String(event['ty']),
    event_json: JSON.stringify(event),
  };
}

describe('parseAttemptEvents', () => {
  it('orders by lsn, not by appended_at', () => {
    const at = '2026-11-24T10:00:00.000Z';
    const events = parseAttemptEvents([
      row(at, { ty: 'AttemptEnded', attempt: 1, lsn: 12, outcome: 'returned' }),
      row(at, { ty: 'ActionRecorded', attempt: 1, lsn: 11, kind: 'SetState' }),
      row(at, { ty: 'AttemptStarted', attempt: 1, lsn: 10, cause: 'first' }),
    ]);
    expect(events.map((event) => event.event.ty)).toEqual([
      'AttemptStarted',
      'ActionRecorded',
      'AttemptEnded',
    ]);
  });

  it('skips malformed and unrelated rows', () => {
    const at = '2026-11-24T10:00:00.000Z';
    const events = parseAttemptEvents([
      { appended_at: at, event_type: 'AttemptStarted', event_json: '{' },
      row(at, { ty: 'TransientError', attempt: 1 }),
      row(at, { ty: 'AttemptStarted' }),
      row(at, { ty: 'AttemptStarted', attempt: 1 }),
    ]);
    expect(events).toHaveLength(1);
  });

  it('accepts the events the server emits today', () => {
    const rows = [
      row('2026-11-24T19:42:42.889Z', {
        ty: 'AttemptStarted',
        attempt: 1,
        deployment_id: 'dp_1',
        protocol_version: 1,
      }),
      row('2026-11-24T19:42:42.913Z', {
        ty: 'AttemptEnded',
        attempt: 1,
        reason: 'end',
      }),
    ];
    expect(hasAttemptRecord(rows)).toBe(true);
    const record = buildAttemptRecord(rows, { isCompleted: true });
    expect(record.attempts).toHaveLength(1);
    expect(record.attempts[0]?.endAt).toBeGreaterThan(
      record.attempts[0]?.startAt ?? 0,
    );
    expect(record.gaps).toHaveLength(0);
  });
});

describe('buildAttemptRecord', () => {
  it('keeps every action in the attempt that made it', () => {
    const record = build(fixture('checkout'));
    expect(record.attempts.map((attempt) => attempt.attempt)).toEqual([1, 2]);
    const [first, second] = record.attempts;
    const firstRoot = first?.nodes[0] as SpanNode;
    const secondRoot = second?.nodes[0] as SpanNode;
    expect(firstRoot.name).toBe('checkout');
    expect(secondRoot.name).toBe('checkout');
    expect(firstRoot).not.toBe(secondRoot);
    expect(firstRoot.attempt).toBe(1);
    expect(secondRoot.attempt).toBe(2);
  });

  it('nests spans by parent_span_id and closes open spans at the attempt end', () => {
    const record = build(fixture('checkout'));
    const first = record.attempts[0];
    const checkout = first?.nodes[0] as SpanNode;
    const reserve = checkout.children[1] as SpanNode;
    expect(reserve.type).toBe('span');
    expect(reserve.name).toBe('reserve stock');
    expect(reserve.endedBy).toBe('attempt');
    expect(reserve.endAt).toBe(first?.endAt);
    const call = reserve.children[0] as ActionNode;
    expect(call.kind).toBe('Call');
    expect(call.result).toBeUndefined();
    expect(call.endAt).toBe(first?.endAt);
  });

  it('runs a call bar to its ResultDelivered', () => {
    const record = build(fixture('checkout'));
    const second = record.attempts[1];
    const checkout = second?.nodes[0] as SpanNode;
    const reserve = checkout.children[0] as SpanNode;
    const call = reserve.children[0] as ActionNode;
    expect(call.result?.variant).toBe('value');
    expect(call.endAt).toBe(call.result?.at);
  });

  it('ends a span inside an atomic group and shows the group members', () => {
    const record = build(fixture('checkout'));
    const second = record.attempts[1];
    const checkout = second?.nodes[0] as SpanNode;
    const reserve = checkout.children[0] as SpanNode;
    const group = checkout.children.find(
      (node) => node.type === 'action' && node.kind === 'AtomicGroup',
    ) as ActionNode;
    expect(group.members?.map((member) => member.kind)).toEqual([
      'SetState',
      'ClearState',
      'SetState',
      'Call',
      'SpanEnd',
    ]);
    expect(reserve.endedBy).toBe('span');
    expect(reserve.endedInGroup).toBe(group.key);
    expect(reserve.endAt).toBe(group.at);
  });

  it('places a span opened in a group beside the group, with its children', () => {
    const record = build(fixture('cancel'));
    const fulfil = record.attempts[0]?.nodes[0] as SpanNode;
    const [group, booking] = fulfil.children;
    expect(group?.type === 'action' && group.kind).toBe('AtomicGroup');
    expect(booking?.type).toBe('span');
    const span = booking as SpanNode;
    expect(span.startedInGroup).toBe(group?.key);
    expect((span.children[0] as ActionNode).summary.target?.service).toBe(
      'Shipping',
    );
  });

  it('describes the gaps between attempts and what woke the invocation', () => {
    const record = build(fixture('checkout'));
    expect(record.gaps).toHaveLength(1);
    const gap = record.gaps[0];
    expect(gap?.kind).toBe('suspended');
    expect(gap?.after.ended?.outstanding?.[0]?.result_id).toBe(4);
    const woken = findActionByResultId(record, 4, 2);
    expect(woken?.attempt).toBe(1);
    expect(woken?.summary.target?.handler).toBe('reserve');
  });

  it('tolerates an attempt with an AttemptEnded and no AttemptStarted', () => {
    const record = build(fixture('retries'));
    const third = record.attempts[2];
    expect(third?.attempt).toBe(3);
    expect(third?.started).toBeUndefined();
    expect(third?.ended?.outcome).toBe('failed');
    expect(record.gaps.map((gap) => gap.kind)).toEqual([
      'backoff',
      'restart',
      'backoff',
      'paused',
    ]);
    expect(record.gaps.at(-1)?.isOngoing).toBe(true);
  });

  it('keeps the last attempt open while the invocation runs', () => {
    const item = fixture('running');
    const record = build(item);
    const last = record.attempts.at(-1);
    expect(last?.isRunning).toBe(true);
    expect(last?.endAt).toBe(Date.parse(item.now));
    const span = last?.nodes[0] as SpanNode;
    expect(span.endedBy).toBe('running');
    const pending = span.children[2] as ActionNode;
    expect(pending.isAwaiting).toBe(true);
  });
});

describe('buildWaterfallScale', () => {
  it('maps the invocation onto [0, 1] in both modes', () => {
    const record = build(fixture('checkout'));
    for (const compress of [false, true]) {
      const scale = buildWaterfallScale(record, compress);
      expect(scale.x(record.startAt)).toBe(0);
      expect(scale.x(record.endAt)).toBe(1);
      const [first, second] = record.attempts;
      expect(scale.x(first?.endAt ?? 0)).toBeLessThanOrEqual(
        scale.x(second?.startAt ?? 0),
      );
    }
  });

  it('shrinks the suspended gap when compressed', () => {
    const record = build(fixture('cancel'));
    const gap = record.gaps[0];
    const linear = buildWaterfallScale(record, false);
    const compressed = buildWaterfallScale(record, true);
    const width = (scale: typeof linear) =>
      scale.x(gap?.to ?? 0) - scale.x(gap?.from ?? 0);
    expect(width(compressed)).toBeLessThan(width(linear));
  });
});

describe('today’s minimal events', () => {
  it('infers the first cause and the outcome from the reason', () => {
    const record = buildAttemptRecord(
      [
        row('2026-11-24T19:42:42.889Z', { ty: 'AttemptStarted', attempt: 1 }),
        row('2026-11-24T19:42:42.913Z', {
          ty: 'AttemptEnded',
          attempt: 1,
          reason: 'end',
        }),
      ],
      { isCompleted: true },
    );
    expect(record.attempts[0]?.started?.cause).toBe('first');
    expect(record.attempts[0]?.ended?.outcome).toBe('returned');
  });
});
