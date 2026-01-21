import { fromBinary } from '@bufbuild/protobuf';
import { CallEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  decodeBinary,
  getTarget,
  parseEntryJson,
  JournalRawEntryWithCommandIndex,
  getEntryResultV2,
  getCompletionEntry,
  getLastFailureV1,
} from './util';

export function callV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(CallEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    start: undefined,
    isPending: !entry.completed,
    commandIndex: entry.index,
    type: 'Call',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: false,
    invocationId: entry.invoked_id,
    serviceKey: message.key,
    serviceName: message.serviceName,
    handlerName: message.handlerName,
    parameters: decode(message.parameter),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
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
              message.result.value.code.toString(),
            )
          : error,
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

function callV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const resultCompletionId = entryJSON?.Command?.Call?.result_completion_id;
  const request = entry.entry_json
    ? entryJSON?.Command?.Call?.request
    : entryJSON?.Command?.Call;
  const invocationId = request?.invocation_id;
  const { name, key, handler } = getTarget(request?.invocation_target);

  const headers = request?.headers;
  const parameters = request?.parameter;

  const completionEntry = getCompletionEntry<
    Extract<JournalEntryV2, { type?: 'Call'; category?: 'notification' }>
  >(resultCompletionId, 'Call', nextEntries);

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
    type: 'Call',
    category: 'command',
    completionId: resultCompletionId,
    completionIndex: completionEntry?.index,
    end: completionEntry?.start,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: completionEntry?.error || error,
    resultType: completionEntry?.resultType,
    headers: headers?.map(
      ({ name, value }: { name: string; value: string }) =>
        ({
          key: name,
          value,
        }) as { key: string; value: string },
    ),
    parameters: decodeBinary(parameters),
    isLoaded:
      typeof entry.entry_json !== 'undefined' &&
      (!completionEntry || completionEntry.isLoaded),
    invocationId,
    handlerName: handler,
    serviceKey: key,
    serviceName: name,
    value: completionEntry?.value,
  };
}

export function call(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return callV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return callV2(entry, nextEntries, invocation);
  }

  return {};
}

export function notificationCall(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Call'; category?: 'notification' }> {
  const entryJSON = parseEntryJson(entry.entry_json);
  const entryLiteJSON = parseEntryJson(entry.entry_lite_json);
  const completionId: number | undefined = entry.entry_json
    ? entryJSON?.Notification?.Completion?.Call?.completion_id
    : entryLiteJSON?.Notification?.id?.CompletionId;
  const result = entry.entry_json
    ? entryJSON?.Notification?.Completion?.Call?.result
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
    type: 'Call',
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
