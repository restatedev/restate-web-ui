import type {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import {
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getCompletionEntry,
  getEntryResultV2,
} from './util';

function attachInvocationV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'AttachInvocation'; category?: 'command' }
> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const completionId = entryJSON?.Command?.AttachInvocation?.completion_id;
  const invocationId =
    entryJSON?.Command?.AttachInvocation?.target?.InvocationId;

  const completionEntry = getCompletionEntry<
    Extract<
      JournalEntryV2,
      { type?: 'AttachInvocation'; category?: 'notification' }
    >
  >(completionId, 'AttachInvocation', nextEntries);

  const { isRetrying, error } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
  );

  return {
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'AttachInvocation',
    category: 'command',
    completionId,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes:
      completionEntry?.index !== undefined
        ? [completionEntry.index]
        : undefined,
    isRetrying,
    error: completionEntry?.error || error,
    resultType: completionEntry?.resultType,
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
    invocationId,
    value: completionEntry?.value,
  };
}

export function attachInvocation(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return attachInvocationV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationAttachInvocation(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'AttachInvocation'; category?: 'notification' }
> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.AttachInvocation?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;

  const result = entry.entry_json
    ? entryJSON?.Notification?.Completion?.AttachInvocation?.result
    : entryLiteJSON?.Notification?.result;

  const { error, resultType, value, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    result,
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: undefined,
    type: 'AttachInvocation',
    category: 'notification',
    completionId,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying: false,
    isLoaded: typeof entry.entry_json !== 'undefined',
    error,
    value,
    resultType,
  };
}
