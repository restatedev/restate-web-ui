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

export const MAX_CACHED_JOURNAL_ROWS = 150_000;

const journals = new Map<string, CachedJournal>();

function cachedSize(journal: CachedJournal) {
  return journal.rows.length + journal.events.length;
}

export function journalCacheKey(baseUrl: string, invocationId: string) {
  return `${baseUrl} ${invocationId}`;
}

export function getCachedJournal(key: string) {
  return journals.get(key);
}

export function setCachedJournal(key: string, journal: CachedJournal) {
  journals.delete(key);
  journals.set(key, journal);
  let total = 0;
  for (const cached of journals.values()) {
    total += cachedSize(cached);
  }
  for (const [cachedKey, cached] of journals) {
    if (total <= MAX_CACHED_JOURNAL_ROWS || cachedKey === key) {
      break;
    }
    journals.delete(cachedKey);
    total -= cachedSize(cached);
  }
}

export function deleteCachedJournal(key: string) {
  journals.delete(key);
}

export function clearJournalCache() {
  journals.clear();
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
    event.after_journal_entry_index,
    event.event_type,
    event.event_json,
  ]);
}

export function appendJournalEvents(
  cachedEvents: JournalEventRow[],
  tailEvents: JournalEventRow[],
) {
  const lastAppendedAt = cachedEvents.at(-1)?.appended_at;
  if (!lastAppendedAt) {
    return tailEvents.length > 0 ? tailEvents : cachedEvents;
  }

  const unmatched = new Map<string, number>();
  for (let i = cachedEvents.length - 1; i >= 0; i--) {
    const event = cachedEvents[i];
    if (event?.appended_at !== lastAppendedAt) {
      break;
    }
    const key = eventKey(event);
    unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
  }

  const newEvents: JournalEventRow[] = [];
  for (const event of tailEvents) {
    const key = eventKey(event);
    const count = unmatched.get(key) ?? 0;
    if (event.appended_at === lastAppendedAt && count > 0) {
      unmatched.set(key, count - 1);
    } else {
      newEvents.push(event);
    }
  }

  for (const count of unmatched.values()) {
    if (count > 0) {
      return undefined;
    }
  }
  return newEvents.length > 0 ? cachedEvents.concat(newEvents) : cachedEvents;
}
