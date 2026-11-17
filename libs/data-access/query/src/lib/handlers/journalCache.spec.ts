import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JournalRawEntry } from '@restate/data-access-admin-api-spec';
import {
  appendJournalRows,
  CACHED_JOURNAL_IDLE_MS,
  type CachedJournal,
  clearJournalCache,
  estimateJournalBytes,
  getCachedJournal,
  isCacheableJournal,
  isJournalReplaced,
  isSameJournalEvents,
  JOURNAL_FALLBACK_COOLDOWN_MS,
  MAX_CACHED_JOURNAL_BYTES,
  noteJournalFallback,
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

describe('isSameJournalEvents', () => {
  it('matches events with the same fields in the same order', () => {
    const events = [
      event('2026-01-01T00:00:01.000Z', 'a'),
      event('2026-01-01T00:00:02.000Z', 'b'),
    ];

    expect(
      isSameJournalEvents(
        events,
        events.map((e) => ({ ...e })),
      ),
    ).toBe(true);
    expect(isSameJournalEvents([], [])).toBe(true);
  });

  it('tells added, removed, reordered and changed events apart', () => {
    const a = event('2026-01-01T00:00:01.000Z', 'a');
    const b = event('2026-01-01T00:00:02.000Z', 'b');

    expect(isSameJournalEvents([a], [a, b])).toBe(false);
    expect(isSameJournalEvents([a, b], [a])).toBe(false);
    expect(isSameJournalEvents([a, b], [b, a])).toBe(false);
    expect(isSameJournalEvents([a], [{ ...a, event_json: '{}' }])).toBe(false);
    expect(isSameJournalEvents([a], [{ ...a, event_type: 'Paused' }])).toBe(
      false,
    );
    expect(
      isSameJournalEvents([a], [{ ...a, after_journal_entry_index: 2 }]),
    ).toBe(false);
    expect(
      isSameJournalEvents([a], [{ ...a, appended_at: b.appended_at }]),
    ).toBe(false);
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

describe('cache budget', () => {
  afterEach(() => {
    clearJournalCache();
    vi.useRealTimers();
  });

  function journalOfBytes(bytes: number) {
    return cachedJournal({ rows: [], entriesJson: 'x'.repeat(bytes) });
  }

  it('estimates rows, events and the entries JSON', () => {
    expect(
      estimateJournalBytes(
        cachedJournal({
          rows: [row(0, { entry_lite_json: '{}' }), row(1)],
          events: [event('2026-01-01T00:00:01.000Z', 'a')],
          entriesJson: '[1]',
        }),
      ),
    ).toBe(
      3 + 256 * 2 + 2 + 128 + JSON.stringify({ error_message: 'a' }).length,
    );
  });

  it('evicts the least recently stored journals over the byte budget', () => {
    const half = Math.floor(MAX_CACHED_JOURNAL_BYTES / 2);

    setCachedJournal('a', journalOfBytes(half));
    setCachedJournal('b', journalOfBytes(half));
    expect(getCachedJournal('a')).toBeDefined();

    setCachedJournal('a', journalOfBytes(half));
    setCachedJournal('c', journalOfBytes(half));

    expect(getCachedJournal('b')).toBeUndefined();
    expect(getCachedJournal('a')).toBeDefined();
    expect(getCachedJournal('c')).toBeDefined();
  });

  it('does not keep a journal that alone exceeds the budget', () => {
    setCachedJournal('a', journalOfBytes(10));
    setCachedJournal('big', journalOfBytes(MAX_CACHED_JOURNAL_BYTES + 1));

    expect(getCachedJournal('big')).toBeUndefined();
    expect(getCachedJournal('a')).toBeDefined();
  });

  it('hides a journal for a minute after a fallback', () => {
    vi.useFakeTimers();
    noteJournalFallback('a');
    setCachedJournal('a', journalOfBytes(10));

    expect(getCachedJournal('a')).toBeUndefined();
    vi.advanceTimersByTime(JOURNAL_FALLBACK_COOLDOWN_MS - 1);
    expect(getCachedJournal('a')).toBeUndefined();
    setCachedJournal('a', journalOfBytes(10));
    vi.advanceTimersByTime(1);
    expect(getCachedJournal('a')).toBeDefined();
  });

  it('drops journals nobody polled for a while', () => {
    vi.useFakeTimers();
    setCachedJournal('a', journalOfBytes(10));
    setCachedJournal('b', journalOfBytes(10));

    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS / 2);
    expect(getCachedJournal('a')).toBeDefined();
    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS / 2);
    expect(getCachedJournal('a')).toBeDefined();
    expect(getCachedJournal('b')).toBeUndefined();

    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS * 2);
    expect(getCachedJournal('a')).toBeUndefined();
  });
});
