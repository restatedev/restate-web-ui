import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
} from './util';

function clearAllStateV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'ClearAllState' }> {
  const { raw } = entry;

  if (!raw) {
    return {};
  }

  const error = getLastFailureV1(entry, invocation);

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: entry.index,
    type: 'ClearAllState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: true,
  };
}

function clearAllStateV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'ClearAllState' }> {
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'ClearAllState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    resultType,
    isLoaded: true,
  };
}

export function clearAllState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return clearAllStateV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return clearAllStateV2(entry, nextEntries, invocation);
  }

  return {};
}
