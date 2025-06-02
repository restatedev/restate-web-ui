import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import {
  getEntryResultV2,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

export function signal(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
):
  | Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'notification' }
    >
  | Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
  | JournalEntryV2 {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);

  const id: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Signal?.id?.index
    : entryLiteJSON?.Notification?.id?.SignalIndex;

  if (id === 1) {
    const { error, relatedIndexes } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      undefined
    );

    return {
      start: entry.appended_at,
      isPending: false,
      commandIndex: undefined,
      type: 'Cancel',
      category: 'notification',
      completionId: undefined,
      end: undefined,
      index: entry.index,
      relatedIndexes,
      isRetrying: false,
      isLoaded: true,
      error,
      value: undefined,
      resultType: undefined,
    } as Extract<
      JournalEntryV2,
      { type?: 'Cancel'; category?: 'notification' }
    >;
  }

  if (id === 17) {
    const result = entry.entry_json
      ? entryJSON?.Notification?.Signal?.result
      : entryLiteJSON?.Notification?.result;

    const { error, resultType, value, isRetrying } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      result
    );

    return {
      start: entry.appended_at,
      isPending: false,
      commandIndex: undefined,
      type: 'CompleteAwakeable',
      category: 'notification',
      completionId: undefined,
      end: undefined,
      index: entry.index,
      relatedIndexes: undefined,
      isRetrying,
      isLoaded: typeof entry.entry_json !== 'undefined',
      error,
      value,
      resultType,
      id: undefined,
    } as Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'notification' }
    >;
  }

  return entry as JournalEntryV2;
}
