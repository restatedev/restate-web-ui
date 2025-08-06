import { fromBinary } from '@bufbuild/protobuf';
import { RunEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getEntryResultV2,
  getCompletionEntry,
  getLastFailureV1,
} from './util';

function runV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Run'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(RunEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    name: message.name,
    start: undefined,
    isPending: !entry.completed,
    commandIndex: entry.index,
    type: 'Run',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: false,
    invocationId: entry.invoked_id,
    value: undefined,
    error,
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
        isLoaded: true,
        resultType: 'failure',
        error: message.result.value.message
          ? new RestateError(
              message.result.value.message,
              message.result.value.code.toString()
            )
          : error,
        value: undefined,
      };
    case 'value':
      return {
        ...metadata,
        isLoaded: true,
        resultType: 'success',
        value: decode(message.result.value),
      };
    default:
      return metadata;
  }
}

function runV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Run'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const resultCompletionId = entryJSON?.Command?.Run?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<JournalEntryV2, { type?: 'Run'; category?: 'notification' }>
  >(resultCompletionId, 'Run', nextEntries);

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index]
  );

  return {
    name: entryJSON?.Command?.Run?.name,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'Run',
    category: 'command',
    completionId: resultCompletionId,
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

export function run(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return runV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return runV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationRun(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Run'; category?: 'notification' }> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.Run?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;
  const result = entry.entry_json
    ? entryJSON?.Notification?.Completion?.Run?.result
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
    type: 'Run',
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
