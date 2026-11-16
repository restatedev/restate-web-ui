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
const ROW_BYTES = 256;
const EVENT_BYTES = 128;

const journals = new Map<string, StoredJournal>();
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
}

function scheduleSweep() {
  if (sweepTimer !== undefined || journals.size === 0) {
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

export function clearJournalCache() {
  journals.clear();
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

function eventKey(event: JournalEventRow) {
  return JSON.stringify([
    event.appended_at,
    event.after_journal_entry_index,
    event.event_type,
    event.event_json,
  ]);
}

export function appendJournalEvents(
  cachedEvents: JournalEventRow[],
  tailEvents: JournalEventRow[],
  totalEvents: number,
) {
  const lastAppendedAt = cachedEvents.at(-1)?.appended_at;
  let keptEvents = cachedEvents.length;
  if (lastAppendedAt) {
    while (cachedEvents[keptEvents - 1]?.appended_at === lastAppendedAt) {
      keptEvents--;
    }
  } else {
    keptEvents = 0;
  }

  const tailCounts = new Map<string, number>();
  for (const event of tailEvents) {
    const key = eventKey(event);
    tailCounts.set(key, (tailCounts.get(key) ?? 0) + 1);
  }
  for (let i = keptEvents; i < cachedEvents.length; i++) {
    const cachedEvent = cachedEvents[i];
    const key = cachedEvent ? eventKey(cachedEvent) : '';
    const count = tailCounts.get(key) ?? 0;
    if (count === 0) {
      return undefined;
    }
    tailCounts.set(key, count - 1);
  }
  if (keptEvents + tailEvents.length !== totalEvents) {
    return undefined;
  }

  const isUnchanged =
    tailEvents.length === cachedEvents.length - keptEvents &&
    tailEvents.every(
      (event, i) =>
        eventKey(event) === eventKey(cachedEvents[keptEvents + i] ?? {}),
    );
  if (isUnchanged) {
    return cachedEvents;
  }
  return keptEvents > 0
    ? cachedEvents.slice(0, keptEvents).concat(tailEvents)
    : tailEvents;
}
