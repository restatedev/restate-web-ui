import { fromBinary } from '@bufbuild/protobuf';
import { SetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
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
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

function setStateV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'SetState' }> {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(SetStateEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  return {
    key: decode(message.key),
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'SetState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    value: decode(message.value),
    resultType: undefined,
    isLoaded: true,
  };
}

function setStateV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'SetState' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
  );

  return {
    key: entryJSON?.Command?.SetState?.key,
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'SetState',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    value: decodeBinary(entryJSON?.Command?.SetState?.value),
    resultType,
    isLoaded: typeof entry.entry_json !== 'undefined',
  };
}

export function setState(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return setStateV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return setStateV2(entry, nextEntries, invocation);
  }

  return {};
}
