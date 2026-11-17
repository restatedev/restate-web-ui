import type { JournalRawEntry } from '@restate/data-access-admin-api-spec';

export type JournalEventRow = {
  after_journal_entry_index?: number;
  appended_at?: string;
  event_type?: string;
  event_json?: string;
};

export type CachedJournal = {
  createdAt?: string;
  rows: JournalRawEntry[];
  events: JournalEventRow[];
  entriesKey: string;
  entriesJson: string;
};

type StoredJournal = {
  journal: CachedJournal;
  bytes: number;
  usedAt: number;
};

export const MAX_CACHED_JOURNAL_BYTES = 80 * 1024 * 1024;
export const CACHED_JOURNAL_IDLE_MS = 60_000;
export const JOURNAL_FALLBACK_COOLDOWN_MS = 60_000;
const ROW_BYTES = 256;
const EVENT_BYTES = 128;

const journals = new Map<string, StoredJournal>();
const fallbacks = new Map<string, number>();
let sweepTimer: ReturnType<typeof setTimeout> | undefined;

export function estimateJournalBytes(journal: CachedJournal) {
  let bytes = journal.entriesJson.length;
  for (const row of journal.rows) {
    bytes += ROW_BYTES + (row.entry_lite_json?.length ?? 0);
  }
  for (const event of journal.events) {
    bytes += EVENT_BYTES + (event.event_json?.length ?? 0);
  }
  return bytes;
}

function dropIdleJournals(now: number) {
  for (const [key, stored] of journals) {
    if (now - stored.usedAt >= CACHED_JOURNAL_IDLE_MS) {
      journals.delete(key);
    }
  }
  for (const [key, fellBackAt] of fallbacks) {
    if (now - fellBackAt >= JOURNAL_FALLBACK_COOLDOWN_MS) {
      fallbacks.delete(key);
    }
  }
}

function scheduleSweep() {
  if (
    sweepTimer !== undefined ||
    (journals.size === 0 && fallbacks.size === 0)
  ) {
    return;
  }
  sweepTimer = setTimeout(() => {
    sweepTimer = undefined;
    dropIdleJournals(Date.now());
    scheduleSweep();
  }, CACHED_JOURNAL_IDLE_MS);
  (sweepTimer as { unref?: () => void }).unref?.();
}

export function journalCacheKey(baseUrl: string, invocationId: string) {
  return `${baseUrl} ${invocationId}`;
}

export function getCachedJournal(key: string) {
  const now = Date.now();
  dropIdleJournals(now);
  if (fallbacks.has(key)) {
    return undefined;
  }
  const stored = journals.get(key);
  if (stored) {
    stored.usedAt = now;
  }
  return stored?.journal;
}

export function setCachedJournal(key: string, journal: CachedJournal) {
  journals.delete(key);
  const bytes = estimateJournalBytes(journal);
  if (bytes > MAX_CACHED_JOURNAL_BYTES) {
    return;
  }
  journals.set(key, { journal, bytes, usedAt: Date.now() });
  let total = 0;
  for (const stored of journals.values()) {
    total += stored.bytes;
  }
  for (const [storedKey, stored] of journals) {
    if (total <= MAX_CACHED_JOURNAL_BYTES) {
      break;
    }
    journals.delete(storedKey);
    total -= stored.bytes;
  }
  scheduleSweep();
}

export function deleteCachedJournal(key: string) {
  journals.delete(key);
}

export function noteJournalFallback(key: string) {
  fallbacks.set(key, Date.now());
  scheduleSweep();
}

export function clearJournalCache() {
  journals.clear();
  fallbacks.clear();
  clearTimeout(sweepTimer);
  sweepTimer = undefined;
}

export function isCacheableJournal(rows: JournalRawEntry[]) {
  return rows.length > 0 && rows.every((row) => row.version === 2);
}

export function isJournalReplaced(
  cached: CachedJournal,
  invocation: { created_at?: unknown; journal_size?: unknown },
) {
  return (
    invocation.created_at !== cached.createdAt ||
    (typeof invocation.journal_size === 'number' &&
      invocation.journal_size < cached.rows.length)
  );
}

export function appendJournalRows(
  cachedRows: JournalRawEntry[],
  tailRows: JournalRawEntry[],
) {
  const last = cachedRows.at(-1);
  const [overlap, ...newRows] = tailRows;
  if (
    !last ||
    !overlap ||
    overlap.index !== last.index ||
    overlap.appended_at !== last.appended_at ||
    overlap.entry_type !== last.entry_type
  ) {
    return undefined;
  }
  let expectedIndex = last.index + 1;
  for (const row of newRows) {
    if (row.version !== 2 || row.index !== expectedIndex) {
      return undefined;
    }
    expectedIndex++;
  }
  return newRows.length > 0 ? cachedRows.concat(newRows) : cachedRows;
}

export function isSameJournalEvents(
  cachedEvents: JournalEventRow[],
  events: JournalEventRow[],
) {
  return (
    cachedEvents.length === events.length &&
    cachedEvents.every((cachedEvent, i) => {
      const event = events[i];
      return (
        event !== undefined &&
        event.appended_at === cachedEvent.appended_at &&
        event.after_journal_entry_index ===
          cachedEvent.after_journal_entry_index &&
        event.event_type === cachedEvent.event_type &&
        event.event_json === cachedEvent.event_json
      );
    })
  );
}
