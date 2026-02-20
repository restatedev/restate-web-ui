import { fromBinary } from '@bufbuild/protobuf';
import { SleepEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api-spec';
import {
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getCompletionEntry,
  getEntryResultV2,
  getLastFailureV1,
} from './util';

function sleepV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(SleepEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    name: message.name,
    start: undefined,
    isPending: !entry.completed,
    commandIndex: entry.index,
    type: 'Sleep',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: true,
    wakeupAt: entry.sleep_wakeup_at,
  } as const;

  switch (message.result.case) {
    case 'empty':
      return {
        ...metadata,
        resultType: 'void',
      };
    case 'failure':
      return {
        ...metadata,
        resultType: 'failure',
        error: message.result.value.message
          ? new RestateError(
              message.result.value.message,
              message.result.value.code.toString(),
            )
          : error,
      };

    default:
      return metadata;
  }
}

function sleepV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;
  const completionId = entryJSON?.Command?.Sleep?.completion_id;

  const completionEntry = getCompletionEntry<
    Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'notification' }>
  >(completionId, 'Sleep', nextEntries);

  const wakeupAt = entryJSON?.Command?.Sleep?.wake_up_time;

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index],
  );

  return {
    name: entryJSON?.Command?.Sleep?.name,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'Sleep',
    category: 'command',
    completionId,
    completionIndex: completionEntry?.index,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: completionEntry?.error || error,
    resultType: completionEntry?.resultType,
    isLoaded: true,
    wakeupAt,
  };
}

export function sleep(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return sleepV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return sleepV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationSleep(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Sleep'; category?: 'notification' }> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.Sleep?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;

  const { error } = getEntryResultV2(entry, invocation, nextEntries, undefined);

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex: undefined,
    type: 'Sleep',
    category: 'notification',
    completionId,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: true,
    error,
    resultType: undefined,
  };
}
