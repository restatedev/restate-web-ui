import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson } from './util';

function clearAllStateV1(entry: JournalRawEntry) {
  const { raw } = entry;

  if (!raw) {
    return {};
  }

  return {
    name: entry.name,
    completed: true,
  };
}

function clearAllStateV2(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  const entryJSON = parseEntryJson(entry.entry_json);

  return {
    name: entryJSON?.Command?.ClearAllState?.name,
    start: entry.appended_at,
    completed: true,
  };
}

export function clearAllState(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1 || !entry.version) {
    return clearAllStateV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return clearAllStateV2(entry, allEntries);
  }

  return {};
}
