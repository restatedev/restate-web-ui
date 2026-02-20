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

function getLazyStateV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'GetLazyState'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const resultCompletionId = entryJSON?.Command?.GetLazyState?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<
      JournalEntryV2,
      { type?: 'GetLazyState'; category?: 'notification' }
    >
  >(resultCompletionId, 'GetLazyState', nextEntries);

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index],
  );

  return {
    key: entryJSON?.Command?.GetLazyState?.key,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'GetLazyState',
    category: 'command',
    completionId: resultCompletionId,
    completionIndex: completionEntry?.index,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: completionEntry?.error || error,
    resultType: completionEntry?.resultType,
    value: completionEntry?.value,
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
  };
}

export function getLazyState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return getLazyStateV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationGetLazyState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'GetLazyState'; category?: 'notification' }
> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetLazyState?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;
  const result = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetLazyState?.result
    : entryLiteJSON?.Notification?.result;

  const { error, resultType, value } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    result,
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: undefined,
    type: 'GetLazyState',
    category: 'notification',
    completionId,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: typeof entry.entry_json !== 'undefined',
    error,
    value,
    resultType,
  };
}
