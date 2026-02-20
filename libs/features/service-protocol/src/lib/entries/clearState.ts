import { fromBinary } from '@bufbuild/protobuf';
import { ClearStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api-spec';
import {
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';
import { binaryToUtf8 } from '@restate/util/binary';

function clearStateV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'ClearState' }> {
  const { raw } = entry;

  if (!raw) {
    return {};
  }

  const message = fromBinary(ClearStateEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  return {
    key: binaryToUtf8(message.key),
    start: entry.appended_at,
    isPending: false,
    commandIndex: entry.index,
    type: 'ClearState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: true,
  };
}

function clearStateV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'ClearState' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
  );

  return {
    key: entryJSON?.Command?.ClearState?.key,
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'ClearState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    resultType,
    isLoaded: true,
  };
}

export function clearState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return clearStateV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return clearStateV2(entry, nextEntries, invocation);
  }

  return {};
}
