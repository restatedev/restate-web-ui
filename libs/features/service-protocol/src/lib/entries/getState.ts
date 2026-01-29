import { fromBinary } from '@bufbuild/protobuf';
import { GetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
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
  getLastFailureV1,
} from './util';
import { binaryToUtf8 } from '@restate/util/binary';

function getStateV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'GetState' | 'GetEagerState' }> {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(GetStateEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    key: binaryToUtf8(message.key),
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'GetEagerState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: true,
    error,
  } as const;

  switch (message.result.case) {
    case 'empty':
      return {
        ...metadata,
        resultType: 'void',
        value: undefined,
      };
    case 'failure':
      return {
        ...metadata,
        resultType: 'failure',
        value: undefined,
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
        resultType: 'success',
        value: decode(message.result.value),
      };
    default:
      return {
        ...metadata,
        resultType: undefined,
        value: undefined,
        error,
      };
  }
}

function getStateV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'GetState' | 'GetEagerState' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;
  const result =
    entryJSON?.Command?.GetEagerState?.result ??
    entryJSON?.Command?.GetState?.result;

  const { isRetrying, error, value, resultType, relatedIndexes } =
    getEntryResultV2(entry, invocation, nextEntries, result);

  return {
    key: entryJSON?.Command?.GetEagerState?.key,
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'GetEagerState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    value,
    resultType,
    isLoaded: typeof entry.entry_json !== 'undefined',
  };
}

export function getState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return getStateV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return getStateV2(entry, nextEntries, invocation);
  }

  return {};
}
