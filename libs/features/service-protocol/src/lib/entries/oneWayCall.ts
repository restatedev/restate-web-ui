import { fromBinary } from '@bufbuild/protobuf';
import { OneWayCallEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  decodeBinary,
  getEntryResultV2,
  getLastFailureV1,
  getTarget,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

function oneWayCallV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'OneWayCall'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(OneWayCallEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  return {
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'OneWayCall',
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
    error,
    invokeTime: message.invokeTime
      ? new Date(Number(message.invokeTime)).toISOString()
      : undefined,
  };
}

function oneWayCallV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'OneWayCall'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;
  const request = entry.entry_json
    ? entryJSON?.Command?.OneWayCall?.request
    : entryJSON?.Command?.OneWayCall;

  const invocationId = request?.invocation_id;
  const { name, key, handler } = getTarget(request?.invocation_target);
  const headers = request?.headers;
  const parameters = request?.parameter;

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'OneWayCall',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    resultType: undefined,
    headers: headers?.map(
      ({ name, value }: { name: string; value: string }) =>
        ({
          key: name,
          value,
        } as { key: string; value: string })
    ),
    parameters: decodeBinary(parameters),
    isLoaded: typeof entry.entry_json !== 'undefined',
    invocationId,
    handlerName: handler,
    serviceKey: key,
    serviceName: name,
  };
}

export function oneWayCall(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return oneWayCallV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return oneWayCallV2(entry, nextEntries, invocation);
  }

  return {};
}
