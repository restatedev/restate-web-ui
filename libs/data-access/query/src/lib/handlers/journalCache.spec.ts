import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendJournalRows,
  CACHED_JOURNAL_IDLE_MS,
  clearJournalCache,
  estimateJournalBytes,
  getCachedJournal,
  JOURNAL_FALLBACK_COOLDOWN_MS,
  MAX_CACHED_JOURNAL_BYTES,
  noteJournalFallback,
  setCachedJournal,
} from './journalCache.js';

function journalOfBytes(bytes: number) {
  return {
    rows: [],
    events: [],
    entriesKey: '',
    entriesJson: 'x'.repeat(bytes),
  };
}

describe('journalCache', () => {
  afterEach(() => {
    clearJournalCache();
    vi.useRealTimers();
  });

  it('rejects a tail row that is not V2', () => {
    const row = (index: number, version = 2) => ({
      index,
      appended_at: `2026-01-01T00:00:0${index}.000Z`,
      entry_type: 'Command: Run' as const,
      version,
    });

    expect(appendJournalRows([row(0)], [row(0), row(1)])).toHaveLength(2);
    expect(appendJournalRows([row(0)], [row(0), row(1, 1)])).toBeUndefined();
  });

  it('estimates rows, events and the entries JSON', () => {
    expect(
      estimateJournalBytes({
        rows: [
          { index: 0, entry_type: 'Command: Run', entry_lite_json: '{}' },
          { index: 1, entry_type: 'Command: Run' },
        ],
        events: [{ event_json: 'abc' }],
        entriesKey: '',
        entriesJson: '[1]',
      }),
    ).toBe(3 + 256 * 2 + 2 + 128 + 3);
  });

  it('evicts the least recently stored journals over the byte budget', () => {
    const half = Math.floor(MAX_CACHED_JOURNAL_BYTES / 2);
    setCachedJournal('a', journalOfBytes(half));
    setCachedJournal('b', journalOfBytes(half));
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

  it('drops journals nobody polled for a while', () => {
    vi.useFakeTimers();
    setCachedJournal('a', journalOfBytes(10));
    setCachedJournal('b', journalOfBytes(10));
    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS / 2);
    getCachedJournal('a');
    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS / 2);

    expect(getCachedJournal('a')).toBeDefined();
    expect(getCachedJournal('b')).toBeUndefined();
    vi.advanceTimersByTime(CACHED_JOURNAL_IDLE_MS * 2);
    expect(getCachedJournal('a')).toBeUndefined();
  });

  it('hides a journal for a minute after a fallback', () => {
    vi.useFakeTimers();
    noteJournalFallback('a');
    setCachedJournal('a', journalOfBytes(10));
    vi.advanceTimersByTime(JOURNAL_FALLBACK_COOLDOWN_MS - 1);

    expect(getCachedJournal('a')).toBeUndefined();
    setCachedJournal('a', journalOfBytes(10));
    vi.advanceTimersByTime(1);
    expect(getCachedJournal('a')).toBeDefined();
  });
});
