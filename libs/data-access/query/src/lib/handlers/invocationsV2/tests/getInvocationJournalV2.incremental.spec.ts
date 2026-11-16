import { describe, expect, it, vi } from 'vitest';
import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import * as convertJournalModule from '../../../convertJournalV2.js';
import { clearJournalCache } from '../../journalCache.js';
import {
  createInvocationV2QueryTestHarness,
  rawInvocation,
} from './testUtils.js';

vi.mock('../../../convertJournalV2.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../convertJournalV2.js')>();
  return { ...original, convertJournalV2: vi.fn(original.convertJournalV2) };
});

type Row = {
  id: string;
  index: number;
  appended_at: string;
  entry_type: string;
  version: number;
  entry_lite_json: string;
};

type EventRow = {
  after_journal_entry_index: number;
  appended_at: string;
  event_type: string;
  event_json: string;
};

function at(second: number) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString();
}

function input(): Row {
  return {
    id: 'inv-a',
    index: 0,
    appended_at: at(0),
    entry_type: 'Command: Input',
    version: 2,
    entry_lite_json: JSON.stringify({ Command: { Input: {} } }),
  };
}

function runCommand(index: number, completionId: number): Row {
  return {
    id: 'inv-a',
    index,
    appended_at: at(index),
    entry_type: 'Command: Run',
    version: 2,
    entry_lite_json: JSON.stringify({
      Command: {
        Run: { completion_id: completionId, name: `step-${completionId}` },
      },
    }),
  };
}

function runNotification(index: number, completionId: number): Row {
  return {
    id: 'inv-a',
    index,
    appended_at: at(index),
    entry_type: 'Notification: Run',
    version: 2,
    entry_lite_json: JSON.stringify({
      Notification: {
        ty: { Completion: 'Run' },
        id: { CompletionId: completionId },
        result: 'Success',
      },
    }),
  };
}

function transientError(second: number, afterIndex: number): EventRow {
  return {
    after_journal_entry_index: afterIndex,
    appended_at: at(second),
    event_type: 'TransientError',
    event_json: JSON.stringify({
      ty: 'TransientError',
      error_code: 500,
      error_message: `failure at ${second}`,
      related_command_index: 1,
    }),
  };
}

type ServerState = {
  invocation?: Record<string, unknown>;
  rows: Row[];
  events: EventRow[];
};

function serve(state: ServerState) {
  return (statement: string) => {
    if (statement.includes('FROM sys_invocation WHERE')) {
      return state.invocation ? [state.invocation] : [];
    }
    if (statement.includes('FROM sys_journal WHERE')) {
      const from = Number(/AND index >= (\d+)/.exec(statement)?.[1] ?? 0);
      return state.rows.filter((row) => row.index >= from);
    }
    if (/from sys_journal_events where/i.test(statement)) {
      const after = /AND appended_at >= '([^']+)'/.exec(statement)?.[1];
      return state.events.filter(
        (event) => !after || event.appended_at >= after,
      );
    }
    return [];
  };
}

function invocationRow(overrides: Record<string, unknown> = {}) {
  return rawInvocation('inv-a', {
    status: 'running',
    journal_size: 3,
    ...overrides,
  });
}

function journalQueries(sql: string[]) {
  return sql.filter((statement) => statement.includes('FROM sys_journal '));
}

function eventQueries(sql: string[]) {
  return sql.filter((statement) => /from sys_journal_events /i.test(statement));
}

describe('GET /query/v2/invocations/:invocationId incremental polling', () => {
  const { sql, get, setResponder } = createInvocationV2QueryTestHarness();
  const convertJournalV2 = vi.mocked(convertJournalModule.convertJournalV2);

  async function poll() {
    const response = await get('/v2/invocations/inv-a');
    return {
      status: response.status,
      body: (await response.json()) as {
        journal: { entries: JournalEntryV2[] };
      },
    };
  }

  async function fullFetch() {
    clearJournalCache();
    return poll();
  }

  function entryAt(
    body: { journal: { entries: JournalEntryV2[] } },
    index: number,
  ) {
    return body.journal.entries.find(
      (entry) => entry.index === index && entry.category !== 'event',
    );
  }

  it('fetches only the rows and events after the last known ones', async () => {
    const state: ServerState = {
      invocation: invocationRow(),
      rows: [input(), runCommand(1, 1)],
      events: [transientError(5, 1)],
    };
    setResponder(serve(state));

    const first = await poll();
    expect(entryAt(first.body, 1)).toMatchObject({ isPending: true });

    state.rows.push(runNotification(2, 1));
    state.events.push(transientError(6, 1));
    sql.length = 0;
    const second = await poll();

    expect(journalQueries(sql)).toEqual([
      expect.stringContaining(
        "WHERE id = 'inv-a' AND index >= 1 ORDER BY index",
      ),
    ]);
    expect(eventQueries(sql)).toEqual([
      expect.stringContaining(
        `WHERE id = 'inv-a' AND appended_at >= '${at(5)}' ORDER BY appended_at`,
      ),
    ]);
    expect(entryAt(second.body, 1)).toMatchObject({
      isPending: false,
      completionIndex: 2,
    });
    expect(second.body.journal).toEqual((await fullFetch()).body.journal);
  });

  it('reuses the converted entries when nothing changed', async () => {
    setResponder(
      serve({
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1), runNotification(2, 1)],
        events: [],
      }),
    );

    const first = await poll();
    convertJournalV2.mockClear();
    const second = await poll();

    expect(convertJournalV2).not.toHaveBeenCalled();
    expect(second.body.journal).toEqual(first.body.journal);
  });

  it('converts again when only the invocation changed', async () => {
    const state: ServerState = {
      invocation: invocationRow(),
      rows: [input(), runCommand(1, 1)],
      events: [],
    };
    setResponder(serve(state));

    const first = await poll();
    expect(entryAt(first.body, 1)?.error).toBeUndefined();

    state.invocation = invocationRow({
      status: 'backing-off',
      last_failure: 'boom',
      last_failure_related_command_index: 1,
      modified_at: at(9),
    });
    convertJournalV2.mockClear();
    const second = await poll();

    expect(convertJournalV2).toHaveBeenCalled();
    expect(entryAt(second.body, 1)).toMatchObject({
      isRetrying: true,
      error: expect.objectContaining({ message: 'boom' }),
    });
    expect(second.body.journal).toEqual((await fullFetch()).body.journal);
  });

  describe('falls back to a full fetch', () => {
    async function expectFullRefetch(state: ServerState, change: () => void) {
      setResponder(serve(state));
      await poll();
      change();
      sql.length = 0;
      const response = await poll();

      expect(journalQueries(sql)).toEqual([
        expect.stringContaining('AND index >='),
        expect.stringContaining("WHERE id = 'inv-a' ORDER BY index"),
      ]);
      expect(response.body.journal).toEqual((await fullFetch()).body.journal);
      return response;
    }

    it('when the last known row was replaced', async () => {
      const state: ServerState = {
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1), runNotification(2, 1)],
        events: [],
      };
      const { body } = await expectFullRefetch(state, () => {
        state.rows = [
          input(),
          runCommand(1, 1),
          { ...runCommand(2, 2), appended_at: at(30) },
          runNotification(3, 2),
        ];
        state.invocation = invocationRow({ journal_size: 4 });
      });

      expect(entryAt(body, 2)).toMatchObject({
        type: 'Run',
        category: 'command',
      });
    });

    it('when the journal shrank', async () => {
      const state: ServerState = {
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1), runNotification(2, 1)],
        events: [],
      };
      await expectFullRefetch(state, () => {
        state.rows = [input()];
        state.invocation = invocationRow({ journal_size: 1 });
      });
    });

    it('when the invocation was recreated under the same id', async () => {
      const state: ServerState = {
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1), runNotification(2, 1)],
        events: [],
      };
      await expectFullRefetch(state, () => {
        state.invocation = invocationRow({ created_at: at(40) });
      });
    });

    it('when a known event is gone', async () => {
      const state: ServerState = {
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1)],
        events: [transientError(5, 1)],
      };
      await expectFullRefetch(state, () => {
        state.events = [];
      });
    });

    it('when new rows leave a gap', async () => {
      const state: ServerState = {
        invocation: invocationRow(),
        rows: [input(), runCommand(1, 1)],
        events: [],
      };
      await expectFullRefetch(state, () => {
        state.rows = [input(), runCommand(1, 1), runNotification(3, 1)];
      });
    });
  });

  it('drops the cached journal once the invocation completed', async () => {
    const state: ServerState = {
      invocation: invocationRow(),
      rows: [input(), runCommand(1, 1)],
      events: [],
    };
    setResponder(serve(state));

    await poll();
    state.rows.push(runNotification(2, 1));
    state.invocation = invocationRow({
      status: 'completed',
      completion_result: 'success',
      completed_at: at(10),
    });
    sql.length = 0;
    await poll();
    await poll();

    expect(journalQueries(sql)).toEqual([
      expect.stringContaining('AND index >= 1'),
      expect.stringContaining("WHERE id = 'inv-a' ORDER BY index"),
    ]);
  });

  it('keeps fetching V1 journals in full with raw', async () => {
    setResponder(
      serve({
        invocation: invocationRow(),
        rows: [
          { ...input(), entry_type: 'Input', version: 1 },
          { ...runCommand(1, 1), entry_type: 'Run', version: 1 },
        ],
        events: [],
      }),
    );

    await poll();
    sql.length = 0;
    await poll();

    expect(journalQueries(sql)).toEqual([
      expect.stringContaining("WHERE id = 'inv-a' ORDER BY index"),
      expect.stringMatching(/raw, version.*WHERE id = 'inv-a' ORDER BY index/),
    ]);
  });

  it('starts over after the invocation is gone', async () => {
    const state: ServerState = {
      invocation: invocationRow(),
      rows: [input(), runCommand(1, 1)],
      events: [],
    };
    setResponder(serve(state));

    await poll();
    state.invocation = undefined;
    state.rows = [];
    expect((await poll()).status).toBe(404);

    state.invocation = invocationRow();
    state.rows = [input(), runCommand(1, 1)];
    sql.length = 0;
    await poll();

    expect(journalQueries(sql)).toEqual([
      expect.stringContaining("WHERE id = 'inv-a' ORDER BY index"),
    ]);
  });
});
