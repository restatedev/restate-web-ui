import { fromBinary } from '@bufbuild/protobuf';
import { InputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
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

function inputV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Input' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(InputEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  return {
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'Input',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    parameters: decode(message.value),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
    isLoaded: true,
    handlerName: invocation?.target_handler_name,
  };
}

function inputV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Input' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined
  );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'Input',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    resultType,
    headers: entryJSON?.Command?.Input?.headers?.map(
      ({ name, value }: { name: string; value: string }) =>
        ({
          key: name,
          value,
        } as { key: string; value: string })
    ),
    parameters: decodeBinary(entryJSON?.Command?.Input?.payload),
    isLoaded: typeof entry.entry_json !== 'undefined',
    handlerName: invocation?.target_handler_name,
  };
}

export function input(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return inputV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return inputV2(entry, nextEntries, invocation);
  }

  return {};
}
