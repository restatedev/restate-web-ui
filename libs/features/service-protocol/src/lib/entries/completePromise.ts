import { fromBinary } from '@bufbuild/protobuf';
import {
  CompletePromiseEntryMessage,
  CompletePromiseEntryMessageSchema,
} from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
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

function getCompletion(completion: CompletePromiseEntryMessage['completion']) {
  switch (completion.case) {
    case 'completionFailure':
      return {
        value: undefined,
        error: new RestateError(
          completion.value.message,
          completion.value.code.toString(),
        ),
        resultType: 'failure',
      } as const;
    case 'completionValue':
      return {
        value: decode(completion.value),
        error: undefined,
        resultType: 'success',
      } as const;
    default:
      return undefined;
  }
}

function completePromiseV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'CompletePromise'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    CompletePromiseEntryMessageSchema,
    toUnit8Array(raw),
  );
  const error = getLastFailureV1(entry, invocation);
  const completion = getCompletion(message.completion);

  const metadata = {
    promiseName: entry.promise_name,
    start: undefined,
    isPending: !completion,
    commandIndex: entry.index,
    type: 'CompletePromise',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error: completion?.error || error,
    resultType: completion?.resultType,
    isLoaded: true,
    value: completion?.value,
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
        error: message.result.value.message
          ? new RestateError(
              message.result.value.message,
              message.result.value.code.toString(),
            )
          : completion?.error || error,
      };
    case 'empty':
      return {
        ...metadata,
        resultType: 'void',
      };
    default:
      return metadata;
  }
}

function completePromiseV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'CompletePromise'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const completionId = entryJSON?.Command?.CompletePromise?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<
      JournalEntryV2,
      { type?: 'CompletePromise'; category?: 'notification' }
    >
  >(completionId, 'CompletePromise', nextEntries);

  const { isRetrying, error, value, resultType } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    entryJSON?.Command?.CompletePromise?.value,
  );

  return {
    promiseName: entryJSON?.Command?.CompletePromise?.key,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'CompletePromise',
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
    resultType,
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
    value,
  };
}

export function completePromise(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return completePromiseV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return completePromiseV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationCompletePromise(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<
  JournalEntryV2,
  { type?: 'CompletePromise'; category?: 'notification' }
> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.CompletePromise?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;

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
    type: 'CompletePromise',
    category: 'notification',
    completionId,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying: false,
    isLoaded: typeof entry.entry_json !== 'undefined',
    error,
    resultType: undefined,
  };
}
