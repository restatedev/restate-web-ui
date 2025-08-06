import { fromBinary } from '@bufbuild/protobuf';
import { OutputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

function outputV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Output'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(OutputEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'Output',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: false,
    value: undefined,
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

function outputV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Output'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, resultType, value, relatedIndexes } =
    getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      entryJSON?.Command?.Output?.result
    );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'Output',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error: error,
    resultType: resultType,
    isLoaded: typeof entry.entry_json !== 'undefined',
    value: value,
  };
}

export function output(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return outputV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return outputV2(entry, nextEntries, invocation);
  }

  return {};
}
