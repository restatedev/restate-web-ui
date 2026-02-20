import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getEntryResultV2,
  getCompletionEntry,
} from './util';

function getLazyStateKeysV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'GetLazyStateKeys'; category?: 'command' }
> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const resultCompletionId =
    entryJSON?.Command?.GetLazyStateKeys?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<
      JournalEntryV2,
      { type?: 'GetLazyStateKeys'; category?: 'notification' }
    >
  >(resultCompletionId, 'GetLazyStateKeys', nextEntries);

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index],
  );

  return {
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'GetLazyStateKeys',
    category: 'command',
    completionId: resultCompletionId,
    completionIndex: completionEntry?.index,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: completionEntry?.error || error,
    keys: completionEntry?.keys,
    resultType: completionEntry?.resultType,
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
  };
}

export function getLazyStateKeys(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return getLazyStateKeysV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationGetLazyStateKeys(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'GetLazyStateKeys'; category?: 'notification' }
> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetLazyStateKeys?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;

  const keys = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetLazyStateKeys?.state_keys
    : undefined;

  const { error } = getEntryResultV2(entry, invocation, nextEntries, undefined);

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: undefined,
    type: 'GetLazyStateKeys',
    category: 'notification',
    completionId,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: typeof entry.entry_json !== 'undefined',
    error,
    keys,
    resultType: keys ? 'success' : undefined,
  };
}
