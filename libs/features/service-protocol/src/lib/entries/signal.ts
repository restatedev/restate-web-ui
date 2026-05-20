import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  assignGroupIds,
  getEntryResultV2,
  type JournalEntryConversionContext,
  type JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

export function signal(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
  context?: JournalEntryConversionContext,
):
  | Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'notification' }
    >
  | Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
  | Extract<JournalEntryV2, { type?: 'Signal'; category?: 'notification' }>
  | JournalEntryV2 {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);

  const id: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Signal?.id?.Index
    : entryLiteJSON?.Notification?.id?.SignalIndex;

  const signalName: string | undefined = entry.entry_json
    ? entryJSON?.Notification?.Signal?.id?.Name
    : entryLiteJSON?.Notification?.id?.SignalName;

  if (id === 1) {
    const { error, relatedIndexes } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      undefined,
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

  if (signalName) {
    const result = entry.entry_json
      ? entryJSON?.Notification?.Signal?.result
      : entryLiteJSON?.Notification?.result;

    const { error, resultType, value, isRetrying } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      result,
    );

    const signalEntry = {
      start: entry.appended_at,
      isPending: false,
      commandIndex: undefined,
      type: 'Signal',
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
      signalName,
    } as Extract<
      JournalEntryV2,
      { type?: 'Signal'; category?: 'notification' }
    >;

    const signalEntries = context?.signalEntriesByName.get(signalName);
    if (signalEntries) {
      signalEntries.unshift(signalEntry);
    } else {
      context?.signalEntriesByName.set(signalName, [signalEntry]);
    }

    return signalEntry;
  }

  if (id && id >= 17) {
    const result = entry.entry_json
      ? entryJSON?.Notification?.Signal?.result
      : entryLiteJSON?.Notification?.result;

    const { error, resultType, value, isRetrying } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      result,
    );

    const signalEntry = {
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

    context?.signalEntryByIndex.set(id, signalEntry);
    if (context?.future?.signalIndexGroupIdsByIndex.has(id)) {
      signalEntry.isAwaitingOn = true;
    }
    assignGroupIds(
      signalEntry,
      context?.future?.signalIndexGroupIdsByIndex.get(id),
    );

    return signalEntry;
  }

  return entry as JournalEntryV2;
}
