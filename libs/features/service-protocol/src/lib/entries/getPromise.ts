import { fromBinary } from '@bufbuild/protobuf';
import { GetPromiseEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  getCompletionEntry,
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

function getPromiseV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'GetPromise'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(GetPromiseEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    promiseName: entry.promise_name,
    start: undefined,
    isPending: !entry.completed,
    commandIndex: entry.index,
    type: 'GetPromise',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: true,
    value: undefined,
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
        resultType: 'failure',
        error: message.result.value.message
          ? new RestateError(
              message.result.value.message,
              message.result.value.code.toString()
            )
          : error,
      };
    case 'value':
      return {
        ...metadata,
        resultType: 'success',
        value: decode(message.result.value),
      };
    default:
      return metadata;
  }
}

function getPromiseV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'GetPromise'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const completionId = entryJSON?.Command?.GetPromise?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<JournalEntryV2, { type?: 'GetPromise'; category?: 'notification' }>
  >(completionId, 'GetPromise', nextEntries);

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index]
  );

  return {
    promiseName: entryJSON?.Command?.GetPromise?.key,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'GetPromise',
    category: 'command',
    completionId,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: completionEntry?.error || error,
    resultType: completionEntry?.resultType,
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
    value: completionEntry?.value,
  };
}

export function getPromise(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return getPromiseV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return getPromiseV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationGetPromise(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'GetPromise'; category?: 'notification' }> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetPromise?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;
  const result = entry.entry_json
    ? entryJSON?.Notification?.Completion?.GetPromise?.result
    : entryLiteJSON?.Notification?.result;

  const { error, resultType, value } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    result
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: undefined,
    type: 'GetPromise',
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
