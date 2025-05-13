import {
  CancelSignalJournalEntryType,
  CompleteAwakeableJournalEntryType,
  JournalEntry,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { parseEntryJson, parseResults } from './util';

export function signal(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
):
  | CancelSignalJournalEntryType
  | CompleteAwakeableJournalEntryType
  | JournalEntry {
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

  if (payload?.id?.Index === 17) {
    return {
      index: entry.index,
      start: entry.appended_at,
      entry_type: 'CompleteAwakeable',
      version: entry.version,
      completed: true,
      ...parseResults(payload?.result),
    } as CompleteAwakeableJournalEntryType;
  }

  return entry as JournalEntry;
}
