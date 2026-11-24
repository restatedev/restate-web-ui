import type { AttemptEventRow } from './attemptRecord';

export interface AttemptFixture {
  id: string;
  title: string;
  description: string;
  invocation: {
    id: string;
    target: string;
    status: string;
    created_at: string;
    completed_at?: string;
  };
  now: string;
  rows: AttemptEventRow[];
}

const DEPLOYMENT = 'dp_14dPbBGbr7t1Session0bjects';

function timeline(base: string, firstLsn: number) {
  const start = Date.parse(base);
  let lsn = firstLsn;
  const rows: AttemptEventRow[] = [];
  return {
    rows,
    at(offsetMs: number) {
      return new Date(start + offsetMs).toISOString();
    },
    add(offsetMs: number, event: Record<string, unknown>) {
      const ty = String(event['ty']);
      rows.push({
        appended_at: new Date(start + offsetMs).toISOString(),
        event_type: ty,
        event_json: JSON.stringify({ ...event, lsn: lsn++ }),
      });
    },
  };
}

function checkoutFixture(): AttemptFixture {
  const t = timeline('2026-11-24T19:40:00.000Z', 4100);
  const callee = 'inv_1k5Inventory0reserve0sku42Ab';
  const mailer = 'inv_1g8Mailer0notify0alice0Xy9Cd';

  t.add(6, {
    ty: 'AttemptStarted',
    attempt: 1,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'first',
  });
  t.add(8, { ty: 'SpanStarted', attempt: 1, span_id: 1, name: 'checkout' });
  t.add(8, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'GetState',
    name: 'load cart',
    parent_span_id: 1,
    level: 'full',
    summary: { scope: 'object', key: 'cart', bytes: 64 },
    payload: '{"items":[{"sku":"sku-42","qty":2}],"total":59.8}',
  });
  t.add(11, {
    ty: 'SpanStarted',
    attempt: 1,
    span_id: 2,
    parent_span_id: 1,
    name: 'reserve stock',
  });
  t.add(12, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'Call',
    name: 'reserve',
    parent_span_id: 2,
    result_id: 4,
    invocation_id_result_id: 3,
    level: 'summary',
    summary: {
      target: { service: 'Inventory', handler: 'reserve', key: 'sku-42' },
      invocation_id: callee,
      bytes: 41,
    },
  });
  t.add(10_031, {
    ty: 'AttemptEnded',
    attempt: 1,
    reason: 'inactivity timeout',
    outcome: 'suspended',
    rule: 6,
    outstanding: [{ result_id: 4, kind: 'call', label: 'reserve' }],
  });

  t.add(14_210, {
    ty: 'AttemptStarted',
    attempt: 2,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'wake_up',
    woken_by: { kind: 'result', result_id: 4 },
  });
  t.add(14_212, {
    ty: 'SpanStarted',
    attempt: 2,
    span_id: 1,
    name: 'checkout',
  });
  t.add(14_213, {
    ty: 'SpanStarted',
    attempt: 2,
    span_id: 2,
    parent_span_id: 1,
    name: 'reserve stock',
  });
  t.add(14_214, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'Call',
    name: 'reserve',
    parent_span_id: 2,
    result_id: 6,
    invocation_id_result_id: 5,
    level: 'summary',
    summary: {
      target: { service: 'Inventory', handler: 'reserve', key: 'sku-42' },
      invocation_id: callee,
      bytes: 41,
    },
  });
  t.add(14_221, {
    ty: 'ResultDelivered',
    attempt: 2,
    result_id: 6,
    variant: 'value',
  });
  t.add(14_221, {
    ty: 'SpanStarted',
    attempt: 2,
    span_id: 3,
    parent_span_id: 1,
    name: 'price order',
  });
  t.add(14_236, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'Call',
    name: 'quote',
    parent_span_id: 3,
    result_id: 8,
    invocation_id_result_id: 7,
    level: 'summary',
    summary: {
      target: { service: 'Pricing', handler: 'quote' },
      invocation_id: 'inv_1q2Pricing0quote0Zz7Kk1',
      bytes: 88,
    },
  });
  t.add(14_402, {
    ty: 'ResultDelivered',
    attempt: 2,
    result_id: 8,
    variant: 'value',
  });
  t.add(14_403, {
    ty: 'SpanEnded',
    attempt: 2,
    span_id: 3,
    outcome: 'value',
    value: '59.8',
  });
  t.add(14_418, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'AtomicGroup',
    name: 'commit order',
    parent_span_id: 1,
    result_id: 13,
    level: 'summary',
    summary: {},
    members: [
      {
        kind: 'SetState',
        name: '',
        parent_span_id: 1,
        level: 'summary',
        summary: { scope: 'object', key: 'orders/o-1093', bytes: 212 },
      },
      {
        kind: 'ClearState',
        name: '',
        parent_span_id: 1,
        level: 'summary',
        summary: { scope: 'object', key: 'cart' },
      },
      {
        kind: 'SetState',
        name: 'progress',
        parent_span_id: 1,
        level: 'full',
        summary: { scope: 'invocation', key: 'step', bytes: 10 },
        payload: '"committed"',
      },
      {
        kind: 'Call',
        name: 'order confirmation',
        parent_span_id: 1,
        invocation_id_result_id: 12,
        level: 'summary',
        summary: {
          target: { service: 'Mailer', handler: 'notify', key: 'alice' },
          invocation_id: mailer,
          bytes: 97,
        },
      },
      {
        kind: 'SpanEnd',
        name: 'reserve stock',
        parent_span_id: 1,
        level: 'summary',
        summary: { span_id: 2, outcome: 'ok' },
      },
    ],
  });
  t.add(14_431, {
    ty: 'SpanEnded',
    attempt: 2,
    span_id: 1,
    outcome: 'value',
    value: '{"order":"o-1093"}',
  });
  t.add(14_433, {
    ty: 'AttemptEnded',
    attempt: 2,
    reason: 'end',
    outcome: 'returned',
  });

  return {
    id: 'checkout',
    title: 'Suspended on a call, woken by its result',
    description:
      'Attempt 1 calls Inventory/reserve and goes silent: suspended (rule 6). The result wakes the invocation; attempt 2 runs from the first line, calls again, prices the order and commits it atomically with a send.',
    invocation: {
      id: 'inv_1cArtAliceCheckout0Session01',
      target: 'Cart/alice/checkout',
      status: 'succeeded',
      created_at: t.at(0),
      completed_at: t.at(14_433),
    },
    now: t.at(20_000),
    rows: t.rows,
  };
}

function cancelFixture(): AttemptFixture {
  const t = timeline('2026-11-24T19:50:00.000Z', 9200);
  const shipping = 'inv_1sh1pping0book0order0Qq42';
  t.add(4, {
    ty: 'AttemptStarted',
    attempt: 1,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'first',
  });
  t.add(5, { ty: 'SpanStarted', attempt: 1, span_id: 1, name: 'fulfil' });
  t.add(6, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'AtomicGroup',
    name: 'start fulfilment',
    parent_span_id: 1,
    level: 'summary',
    summary: {},
    members: [
      {
        kind: 'SetState',
        name: '',
        parent_span_id: 1,
        level: 'summary',
        summary: { scope: 'invocation', key: 'step', bytes: 9 },
      },
      {
        kind: 'SpanStart',
        name: 'book shipping',
        parent_span_id: 1,
        level: 'summary',
        summary: { span_id: 2 },
      },
    ],
  });
  t.add(9, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'Call',
    name: '',
    parent_span_id: 2,
    result_id: 6,
    invocation_id_result_id: 5,
    level: 'summary',
    summary: {
      target: { service: 'Shipping', handler: 'book' },
      invocation_id: shipping,
      bytes: 120,
    },
  });
  t.add(10, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'ReadSignal',
    name: 'manager approval',
    parent_span_id: 1,
    result_id: 7,
    level: 'summary',
    summary: { signal_name: 'approval', signal_index: 0 },
  });
  t.add(10_012, {
    ty: 'AttemptEnded',
    attempt: 1,
    reason: 'inactivity timeout',
    outcome: 'suspended',
    rule: 6,
    outstanding: [
      { result_id: 6, kind: 'call', label: 'Shipping/book' },
      { result_id: 7, kind: 'signal_read', label: 'manager approval' },
    ],
  });
  t.add(73_500, {
    ty: 'AttemptStarted',
    attempt: 2,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'wake_up',
    woken_by: { kind: 'cancel' },
  });
  t.add(73_502, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'CancelInvocation',
    name: 'cancel shipping',
    level: 'summary',
    summary: { invocation_id: shipping },
  });
  t.add(73_502, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'AtomicGroup',
    name: 'roll back',
    level: 'summary',
    summary: {},
    members: [
      {
        kind: 'SetState',
        name: '',
        level: 'summary',
        summary: { scope: 'object', key: 'status', bytes: 11 },
      },
      {
        kind: 'SendSignal',
        name: 'notify requester',
        level: 'summary',
        summary: {
          invocation_id: 'inv_1rEquester0wAiting0Mm81',
          signal_name: 'fulfilment-cancelled',
        },
      },
    ],
  });
  t.add(73_506, {
    ty: 'AttemptEnded',
    attempt: 2,
    reason: 'end',
    outcome: 'returned',
    failure: { code: 409, message: 'cancelled by the requester' },
  });
  return {
    id: 'cancel',
    title: 'Waiting on a call and a signal, then cancelled',
    description:
      'Attempt 1 opens a span inside an atomic group, calls Shipping/book and reads a signal; it suspends waiting on both. The cancel signal wakes it; attempt 2 cancels the callee, rolls back and returns a failure.',
    invocation: {
      id: 'inv_1fulfilOrder0o1093Bb7Cancel',
      target: 'Orders/o-1093/fulfil',
      status: 'failed',
      created_at: t.at(0),
      completed_at: t.at(73_506),
    },
    now: t.at(80_000),
    rows: t.rows,
  };
}

function retriesFixture(): AttemptFixture {
  const t = timeline('2026-11-24T20:00:00.000Z', 15000);
  t.add(3, {
    ty: 'AttemptStarted',
    attempt: 1,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'first',
  });
  t.add(5, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'SetState',
    name: '',
    level: 'summary',
    summary: { scope: 'invocation', key: 'step', bytes: 7 },
  });
  t.add(41, {
    ty: 'AttemptEnded',
    attempt: 1,
    reason: 'ErrorMessage, retry',
    outcome: 'failed',
    failure: { code: 500, message: 'connect ECONNREFUSED 10.0.3.7:5432' },
  });
  t.add(545, {
    ty: 'AttemptStarted',
    attempt: 2,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'retry',
  });
  t.add(546, { ty: 'SpanStarted', attempt: 2, span_id: 1, name: 'migrate' });
  t.add(548, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'SetState',
    name: '',
    parent_span_id: 1,
    level: 'summary',
    summary: { scope: 'object', key: 'schema/v3', bytes: 2048 },
  });
  t.add(1_920, {
    ty: 'AttemptEnded',
    attempt: 2,
    reason: 'node draining',
    outcome: 'restarted',
    rule: 1,
  });
  t.add(2_310, {
    ty: 'AttemptEnded',
    attempt: 3,
    reason: 'deployment unreachable',
    outcome: 'failed',
    failure: { code: 503, message: 'deployment unreachable' },
  });
  t.add(3_330, {
    ty: 'AttemptStarted',
    attempt: 4,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'retry',
  });
  t.add(3_331, { ty: 'SpanStarted', attempt: 4, span_id: 1, name: 'migrate' });
  t.add(3_333, {
    ty: 'ActionRecorded',
    attempt: 4,
    kind: 'SetState',
    name: '',
    parent_span_id: 1,
    level: 'summary',
    summary: { scope: 'object', key: 'schema/v3', bytes: 2048 },
  });
  t.add(3_380, {
    ty: 'SpanEnded',
    attempt: 4,
    span_id: 1,
    outcome: 'failure',
    failure: { code: 500, message: 'constraint violation on accounts.email' },
  });
  t.add(3_381, {
    ty: 'AttemptEnded',
    attempt: 4,
    reason: 'retries exhausted',
    outcome: 'paused',
    failure: { code: 500, message: 'constraint violation on accounts.email' },
  });
  return {
    id: 'retries',
    title: 'Failures, a restart, an attempt that never started, a pause',
    description:
      'Attempt 1 fails and is retried; attempt 2 is restarted by the runtime (rule 1); attempt 3 fails before it starts (no AttemptStarted); attempt 4 fails inside a span and the invocation is paused.',
    invocation: {
      id: 'inv_1dbMigrate0tenant7Pause0Rr3',
      target: 'Tenants/t-7/migrate',
      status: 'paused',
      created_at: t.at(0),
    },
    now: t.at(9_000),
    rows: t.rows,
  };
}

function runningFixture(): AttemptFixture {
  const t = timeline('2026-11-24T20:10:00.000Z', 22000);
  t.add(5, {
    ty: 'AttemptStarted',
    attempt: 1,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'first',
  });
  t.add(7, {
    ty: 'ActionRecorded',
    attempt: 1,
    kind: 'Call',
    name: 'warm cache',
    result_id: 2,
    invocation_id_result_id: 1,
    level: 'summary',
    summary: {
      target: { service: 'Cache', handler: 'warm' },
      invocation_id: 'inv_1cAche0warm0Ll5Tt0Running',
    },
  });
  t.add(250, {
    ty: 'AttemptEnded',
    attempt: 1,
    reason: 'partition leader changed',
    outcome: 'lost',
  });
  t.add(260, {
    ty: 'AttemptStarted',
    attempt: 2,
    deployment_id: DEPLOYMENT,
    protocol_version: 1,
    cause: 'restart',
  });
  t.add(262, { ty: 'SpanStarted', attempt: 2, span_id: 1, name: 'index docs' });
  t.add(270, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'Call',
    name: 'embed batch 1',
    parent_span_id: 1,
    result_id: 4,
    invocation_id_result_id: 3,
    level: 'summary',
    summary: {
      target: { service: 'Embedder', handler: 'embed' },
      invocation_id: 'inv_1eMbed0batch1Hh2Running0',
      bytes: 9100,
    },
  });
  t.add(1_870, {
    ty: 'ResultDelivered',
    attempt: 2,
    result_id: 4,
    variant: 'value',
  });
  t.add(1_880, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'SetState',
    name: 'checkpoint',
    parent_span_id: 1,
    level: 'summary',
    summary: { scope: 'invocation', key: 'cursor', bytes: 8 },
  });
  t.add(1_884, {
    ty: 'ActionRecorded',
    attempt: 2,
    kind: 'Call',
    name: 'embed batch 2',
    parent_span_id: 1,
    result_id: 6,
    invocation_id_result_id: 5,
    level: 'summary',
    summary: {
      target: { service: 'Embedder', handler: 'embed' },
      invocation_id: 'inv_1eMbed0batch2Jj9Running0',
      bytes: 9230,
    },
  });
  return {
    id: 'running',
    title: 'Running now, after a lost attempt',
    description:
      'Attempt 1 is lost (a failover) and restarted. Attempt 2 is still running: its span is open and its second call has no result yet.',
    invocation: {
      id: 'inv_1iNdex0docs0Running0Gg4',
      target: 'Indexer/docs/run',
      status: 'running',
      created_at: t.at(0),
    },
    now: t.at(3_200),
    rows: t.rows,
  };
}

export const ATTEMPT_FIXTURES: AttemptFixture[] = [
  checkoutFixture(),
  cancelFixture(),
  retriesFixture(),
  runningFixture(),
];
