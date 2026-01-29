import { fromBinary } from '@bufbuild/protobuf';
import { GetStateKeysEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import {
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';
import { binaryToUtf8 } from '@restate/util/binary';

function getStateKeysV1(
  entry: JournalRawEntryWithCommandIndex,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'GetStateKeys' | 'GetEagerStateKeys' }> {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(GetStateKeysEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    start: entry.appended_at,
    isPending: false,
    commandIndex: entry.index,
    type: 'GetEagerStateKeys',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    isLoaded: true,
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
        keys: undefined,
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
        resultType: 'success',
        keys: message.result.value.keys.map(binaryToUtf8),
      };
    default:
      return {
        ...metadata,
        resultType: 'success',
        keys: undefined,
      };
  }
}

function getStateKeysV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'GetStateKeys' | 'GetEagerStateKeys' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'GetEagerStateKeys',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    keys: entryJSON?.Command?.GetEagerStateKeys?.state_keys,
    resultType,
    isLoaded: typeof entry.entry_json !== 'undefined',
  };
}

export function getStateKeys(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return getStateKeysV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return getStateKeysV2(entry, nextEntries, invocation);
  }

  return {};
}
