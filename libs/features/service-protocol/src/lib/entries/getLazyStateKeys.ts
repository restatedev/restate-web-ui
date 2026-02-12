import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import {
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getEntryResultV2,
} from './util';

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
