import { describe, expect, it, vi } from 'vitest';
import * as convertJournalModule from '../../../convertJournalV2.js';
import {
  clearJournalCache,
  getCachedJournal,
  journalCacheKey,
} from '../../journalCache.js';
import {
  createInvocationV2QueryTestHarness,
  rawInvocation,
} from './testUtils.js';

vi.mock('../../../convertJournalV2.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../convertJournalV2.js')>();
  return { ...original, convertJournalV2: vi.fn(original.convertJournalV2) };
});

function at(second: number) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString();
}

function row(index: number, entryType: string, lite: unknown) {
  return {
    id: 'inv-a',
    index,
    appended_at: at(index),
    entry_type: entryType,
    version: 2,
    entry_lite_json: JSON.stringify(lite),
  } as Record<string, unknown> & { index: number };
}

const input = () => row(0, 'Command: Input', { Command: { Input: {} } });
const run = (index: number, id: number) =>
  row(index, 'Command: Run', {
    Command: { Run: { completion_id: id, name: `step-${id}` } },
  });
const runDone = (index: number, id: number) =>
  row(index, 'Notification: Run', {
    Notification: {
      ty: { Completion: 'Run' },
      id: { CompletionId: id },
      result: 'Success',
    },
  });
const failure = (second: number) => ({
  after_journal_entry_index: 1,
  appended_at: at(second),
  event_type: 'TransientError',
  event_json: JSON.stringify({
    ty: 'TransientError',
    error_code: 500,
    error_message: `failure at ${second}`,
    related_command_index: 1,
  }),
});
const invocationRow = (overrides: Record<string, unknown> = {}) =>
  rawInvocation('inv-a', { status: 'running', journal_size: 3, ...overrides });

type Server = {
  invocation?: Record<string, unknown>;
  rows: (Record<string, unknown> & { index: number })[];
  events: Record<string, unknown>[];
  vqueueStatus?: Record<string, unknown>;
};

function serve(server: Server) {
  return (statement: string) => {
    if (statement.includes('FROM sys_invocation WHERE')) {
      return server.invocation ? [server.invocation] : [];
    }
    if (statement.includes('FROM sys_journal WHERE')) {
      const from = Number(/AND index >= (\d+)/.exec(statement)?.[1] ?? 0);
      return server.rows.filter((r) => r.index >= from);
    }
    if (statement.includes('FROM sys_vqueue_entry_status WHERE')) {
      return server.vqueueStatus ? [server.vqueueStatus] : [];
    }
    if (/from sys_journal_events where/i.test(statement)) {
      return server.events;
    }
    return [];
  };
}

const withoutDuration = (body: string) =>
  body.replace(/"duration":"[^"]*",?/, '');
const TAIL = expect.stringContaining('AND index >=');
const FULL = expect.stringContaining("WHERE id = 'inv-a' ORDER BY index");

describe('GET /query/v2/invocations/:invocationId incremental polling', () => {
  const { sql, get, setResponder } = createInvocationV2QueryTestHarness();
  const convertJournalV2 = vi.mocked(convertJournalModule.convertJournalV2);

  async function poll() {
    const response = await get('/v2/invocations/inv-a');
    const text = await response.text();
    return { status: response.status, text };
  }

  async function start(server: Server) {
    setResponder(serve(server));
    const first = await poll();
    sql.length = 0;
    convertJournalV2.mockClear();
    return first;
  }

  async function expectSameAsFullFetch(text: string) {
    clearJournalCache();
    expect(withoutDuration(text)).toBe(withoutDuration((await poll()).text));
  }

  const journalQueries = () =>
    sql.filter((statement) => statement.includes('FROM sys_journal '));
  const count = (table: RegExp) =>
    sql.filter((statement) => table.test(statement)).length;

  it('fetches only the rows after the last known one and all events', async () => {
    const server: Server = {
      invocation: invocationRow(),
      rows: [input(), run(1, 1)],
      events: [failure(5)],
    };
    await start(server);
    server.rows.push(runDone(2, 1));
    const { text } = await poll();

    expect(sql.filter((statement) => /sys_journal(_events)? /i.test(statement)))
      .toMatchInlineSnapshot(`
      [
        "SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json,  version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = 'inv-a' AND index >= 1 ORDER BY index",
        "SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = 'inv-a' ORDER BY appended_at",
      ]
    `);
    expect(JSON.parse(text).journal.entries).toContainEqual(
      expect.objectContaining({
        index: 1,
        isPending: false,
        completionIndex: 2,
      }),
    );
    await expectSameAsFullFetch(text);
  });

  it('reuses the converted entries when nothing changed', async () => {
    const first = await start({
      invocation: invocationRow(),
      rows: [input(), run(1, 1), runDone(2, 1)],
      events: [failure(5)],
    });
    const second = await poll();

    expect(convertJournalV2).not.toHaveBeenCalled();
    expect(JSON.parse(second.text).journal).toEqual(
      JSON.parse(first.text).journal,
    );
  });

  it.each<[string, (server: Server) => void]>([
    ['a new event', (s) => s.events.push(failure(6))],
    ['an event with an earlier timestamp', (s) => (s.events[0] = failure(4))],
    ['events sharing a timestamp in a new order', (s) => s.events.reverse()],
    [
      'the invocation row',
      (s) => {
        s.invocation = invocationRow({
          status: 'backing-off',
          last_failure: 'boom',
          last_failure_related_command_index: 1,
        });
      },
    ],
    [
      'the queue status',
      (s) => {
        s.vqueueStatus = { entry_id: 'inv-a', stage: 'suspended' };
      },
    ],
  ])('converts again from the tail after a change in %s', async (_, change) => {
    const server: Server = {
      invocation: invocationRow({ status: 'backing-off' }),
      rows: [input(), run(1, 1)],
      events: [failure(5), { ...failure(5), event_type: 'Paused' }],
      vqueueStatus: { entry_id: 'inv-a', stage: 'running' },
    };
    await start(server);
    change(server);
    const { text } = await poll();

    expect(convertJournalV2).toHaveBeenCalled();
    expect(journalQueries()).toEqual([TAIL]);
    await expectSameAsFullFetch(text);
  });

  it.each<[string, (server: Server) => void]>([
    [
      'the last known row was replaced at another time',
      (s) => {
        s.rows = [
          input(),
          run(1, 1),
          { ...runDone(2, 1), appended_at: at(30) },
        ];
      },
    ],
    [
      'the last known row was replaced by another type',
      (s) => {
        s.rows = [input(), run(1, 1), run(2, 2)];
      },
    ],
    [
      'the journal shrank',
      (s) => {
        s.rows = [input()];
        s.invocation = invocationRow({ journal_size: 1 });
      },
    ],
    [
      'the invocation reports fewer entries',
      (s) => {
        s.invocation = invocationRow({ journal_size: 2 });
      },
    ],
    [
      'the invocation was recreated under the same id',
      (s) => {
        s.invocation = invocationRow({ created_at: at(40) });
      },
    ],
    ['new rows leave a gap', (s) => s.rows.push(runDone(4, 1))],
  ])('re-reads only the journal when %s', async (_, change) => {
    const server: Server = {
      invocation: invocationRow(),
      rows: [input(), run(1, 1), runDone(2, 1)],
      events: [],
    };
    await start(server);
    change(server);
    const { text } = await poll();

    expect(journalQueries()).toEqual([TAIL, FULL]);
    expect(count(/FROM sys_invocation/)).toBe(1);
    expect(count(/FROM sys_vqueue_entry_status/)).toBe(1);
    expect(count(/from sys_journal_events/i)).toBe(1);
    await expectSameAsFullFetch(text);
  });

  it('skips the tail for a minute after a fallback', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const server: Server = {
      invocation: invocationRow(),
      rows: [input(), run(1, 1), runDone(2, 1)],
      events: [],
    };
    await start(server);
    server.rows = [input(), run(1, 1), { ...run(2, 2), appended_at: at(30) }];
    await poll();
    vi.setSystemTime(Date.now() + 59_000);
    await poll();
    vi.setSystemTime(Date.now() + 2_000);
    await poll();

    expect(journalQueries()).toEqual([TAIL, FULL, FULL, TAIL]);
  });

  it('leaves the cached rows untouched while converting', async () => {
    const server: Server = {
      invocation: invocationRow(),
      rows: [
        input(),
        run(1, 1),
        {
          ...row(2, 'Notification: Signal', {
            Notification: { id: { SignalIndex: 5 }, result: 'Void' },
          }),
          raw_length: 7,
        },
      ],
      events: [failure(5)],
    };
    await start(server);
    const cached = getCachedJournal(
      journalCacheKey('http://query.test', 'inv-a'),
    );
    [...(cached?.rows ?? []), ...(cached?.events ?? [])].forEach((r) =>
      Object.freeze(r),
    );
    server.rows.push(runDone(3, 1));

    await expectSameAsFullFetch((await poll()).text);
  });

  it('serves overlapping polls from the same cached journal', async () => {
    const server: Server = {
      invocation: invocationRow(),
      rows: [input(), run(1, 1)],
      events: [],
    };
    await start(server);
    server.rows.push(runDone(2, 1));
    const [a, b] = await Promise.all([poll(), poll()]);
    const c = await poll();

    expect(journalQueries()).toEqual([TAIL, TAIL, TAIL]);
    expect(withoutDuration(b.text)).toBe(withoutDuration(a.text));
    await expectSameAsFullFetch(c.text);
  });

  it('fetches in full again once the invocation was gone or completed', async () => {
    const server: Server = {
      invocation: invocationRow(),
      rows: [input(), run(1, 1)],
      events: [],
    };
    await start(server);
    server.invocation = undefined;
    expect((await poll()).status).toBe(404);
    server.invocation = invocationRow();
    await poll();
    server.invocation = invocationRow({
      status: 'completed',
      completion_result: 'success',
      completed_at: at(10),
    });
    await poll();
    await poll();

    expect(journalQueries()).toEqual([TAIL, FULL, TAIL, FULL]);
  });

  it('keeps fetching V1 journals in full with raw', async () => {
    await start({
      invocation: invocationRow(),
      rows: [
        { ...input(), entry_type: 'Input', version: 1 },
        { ...run(1, 1), entry_type: 'Run', version: 1 },
      ],
      events: [],
    });
    await poll();

    expect(journalQueries()).toEqual([
      FULL,
      expect.stringMatching(/raw, version.*WHERE id = 'inv-a' ORDER BY index/),
    ]);
  });
});
