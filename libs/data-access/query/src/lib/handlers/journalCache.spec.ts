import { afterEach, describe, expect, it } from 'vitest';
import type { JournalRawEntry } from '@restate/data-access-admin-api-spec';
import {
  appendJournalEvents,
  appendJournalRows,
  type CachedJournal,
  clearJournalCache,
  getCachedJournal,
  isCacheableJournal,
  isJournalReplaced,
  MAX_CACHED_JOURNAL_ROWS,
  setCachedJournal,
} from './journalCache.js';

function row(
  index: number,
  overrides: Partial<JournalRawEntry> = {},
): JournalRawEntry {
  return {
    index,
    appended_at: `2026-01-01T00:00:0${index}.000Z`,
    entry_type: 'Command: Run',
    version: 2,
    ...overrides,
  };
}

function event(appendedAt: string, message: string) {
  return {
    after_journal_entry_index: 1,
    appended_at: appendedAt,
    event_type: 'TransientError',
    event_json: JSON.stringify({ error_message: message }),
  };
}

function cachedJournal(overrides: Partial<CachedJournal> = {}): CachedJournal {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    rows: [row(0), row(1)],
    events: [],
    entriesKey: '',
    entriesJson: '[]',
    ...overrides,
  };
}

describe('appendJournalRows', () => {
  it('appends the rows after the overlapping last row', () => {
    const cached = [row(0), row(1)];

    expect(appendJournalRows(cached, [row(1), row(2), row(3)])).toEqual([
      row(0),
      row(1),
      row(2),
      row(3),
    ]);
  });

  it('keeps the cached array when only the overlapping row comes back', () => {
    const cached = [row(0), row(1)];

    expect(appendJournalRows(cached, [row(1)])).toBe(cached);
  });

  it('rejects a tail without the overlapping row', () => {
    expect(appendJournalRows([row(0), row(1)], [])).toBeUndefined();
    expect(appendJournalRows([row(0), row(1)], [row(2)])).toBeUndefined();
    expect(appendJournalRows([], [row(0)])).toBeUndefined();
  });

  it('rejects a tail whose overlapping row was replaced', () => {
    const cached = [row(0), row(1)];

    expect(
      appendJournalRows(cached, [
        row(1, { appended_at: '2026-01-02T00:00:00.000Z' }),
        row(2),
      ]),
    ).toBeUndefined();
    expect(
      appendJournalRows(cached, [
        row(1, { entry_type: 'Notification: Run' }),
        row(2),
      ]),
    ).toBeUndefined();
  });

  it('rejects gaps and rows that are not V2', () => {
    const cached = [row(0), row(1)];

    expect(appendJournalRows(cached, [row(1), row(3)])).toBeUndefined();
    expect(
      appendJournalRows(cached, [row(1), row(2, { version: 1 })]),
    ).toBeUndefined();
  });
});

describe('appendJournalEvents', () => {
  it('takes the whole tail when nothing was cached', () => {
    const tail = [event('2026-01-01T00:00:01.000Z', 'a')];

    expect(appendJournalEvents([], tail)).toBe(tail);
  });

  it('skips the cached events that share the last timestamp', () => {
    const cached = [
      event('2026-01-01T00:00:01.000Z', 'a'),
      event('2026-01-01T00:00:02.000Z', 'b'),
      event('2026-01-01T00:00:02.000Z', 'c'),
    ];

    expect(
      appendJournalEvents(cached, [
        event('2026-01-01T00:00:02.000Z', 'c'),
        event('2026-01-01T00:00:02.000Z', 'd'),
        event('2026-01-01T00:00:02.000Z', 'b'),
        event('2026-01-01T00:00:03.000Z', 'e'),
      ]),
    ).toEqual([
      ...cached,
      event('2026-01-01T00:00:02.000Z', 'd'),
      event('2026-01-01T00:00:03.000Z', 'e'),
    ]);
  });

  it('keeps the cached array when nothing new arrived', () => {
    const cached = [event('2026-01-01T00:00:01.000Z', 'a')];

    expect(
      appendJournalEvents(cached, [event('2026-01-01T00:00:01.000Z', 'a')]),
    ).toBe(cached);
  });

  it('counts identical events at the same timestamp separately', () => {
    const cached = [
      event('2026-01-01T00:00:01.000Z', 'a'),
      event('2026-01-01T00:00:01.000Z', 'a'),
    ];

    expect(
      appendJournalEvents(cached, [
        event('2026-01-01T00:00:01.000Z', 'a'),
        event('2026-01-01T00:00:01.000Z', 'a'),
        event('2026-01-01T00:00:01.000Z', 'a'),
      ]),
    ).toEqual([...cached, event('2026-01-01T00:00:01.000Z', 'a')]);
  });

  it('rejects a tail that lost a cached event', () => {
    const cached = [
      event('2026-01-01T00:00:01.000Z', 'a'),
      event('2026-01-01T00:00:01.000Z', 'b'),
    ];

    expect(
      appendJournalEvents(cached, [event('2026-01-01T00:00:01.000Z', 'a')]),
    ).toBeUndefined();
    expect(appendJournalEvents(cached, [])).toBeUndefined();
  });
});

describe('isJournalReplaced', () => {
  it('detects a recreated invocation and a shrunk journal', () => {
    const cached = cachedJournal();

    expect(
      isJournalReplaced(cached, {
        created_at: '2026-01-01T00:00:00.000Z',
        journal_size: 2,
      }),
    ).toBe(false);
    expect(
      isJournalReplaced(cached, {
        created_at: '2026-01-01T00:00:00.000Z',
        journal_size: null,
      }),
    ).toBe(false);
    expect(
      isJournalReplaced(cached, {
        created_at: '2026-01-02T00:00:00.000Z',
        journal_size: 2,
      }),
    ).toBe(true);
    expect(
      isJournalReplaced(cached, {
        created_at: '2026-01-01T00:00:00.000Z',
        journal_size: 1,
      }),
    ).toBe(true);
  });
});

describe('isCacheableJournal', () => {
  it('caches only non-empty V2 journals', () => {
    expect(isCacheableJournal([row(0), row(1)])).toBe(true);
    expect(isCacheableJournal([])).toBe(false);
    expect(isCacheableJournal([row(0), row(1, { version: 1 })])).toBe(false);
    expect(isCacheableJournal([row(0, { version: undefined })])).toBe(false);
  });
});

describe('setCachedJournal', () => {
  afterEach(() => {
    clearJournalCache();
  });

  it('evicts the least recently stored journals over the row budget', () => {
    const half = Math.ceil(MAX_CACHED_JOURNAL_ROWS / 2);
    const rows = Array.from({ length: half }, (_, index) => row(index));

    setCachedJournal('a', cachedJournal({ rows }));
    setCachedJournal('b', cachedJournal({ rows }));
    expect(getCachedJournal('a')).toBeDefined();

    setCachedJournal('a', cachedJournal({ rows }));
    setCachedJournal('c', cachedJournal({ rows }));

    expect(getCachedJournal('b')).toBeUndefined();
    expect(getCachedJournal('a')).toBeDefined();
    expect(getCachedJournal('c')).toBeDefined();
  });

  it('keeps a journal that alone exceeds the budget', () => {
    const rows = Array.from(
      { length: MAX_CACHED_JOURNAL_ROWS + 1 },
      (_, index) => row(index),
    );

    setCachedJournal('a', cachedJournal());
    setCachedJournal('big', cachedJournal({ rows }));

    expect(getCachedJournal('a')).toBeUndefined();
    expect(getCachedJournal('big')).toBeDefined();
  });
});
