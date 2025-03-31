import {
  CancelSignalJournalEntryType,
  JournalEntry,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { parseEntryJson } from './util';

export function signal(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): CancelSignalJournalEntryType | JournalEntry {
  const entryJSON = parseEntryJson(entry.entry_json);
  const payload = entryJSON?.Notification?.Signal;

  if (payload?.id?.Index === 1) {
    return {
      index: entry.index,
      start: entry.appended_at,
      entry_type: 'CancelSignal',
      version: entry.version,
      completed: entry.completed,
    } as CancelSignalJournalEntryType;
  }

  return entry as JournalEntry;
}
