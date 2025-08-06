import { fromBinary } from '@bufbuild/protobuf';
import { CompleteAwakeableEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
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

function completeAwakeableV1(
  entry: JournalRawEntry,
  invocation?: Invocation
): Extract<
  JournalEntryV2,
  { type?: 'CompleteAwakeable'; category?: 'command' }
> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    CompleteAwakeableEntryMessageSchema,
    toUnit8Array(raw)
  );
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    start: undefined,
    isPending: false,
    commandIndex: entry.index,
    type: 'CompleteAwakeable',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes: undefined,
    isRetrying: false,
    error,
    resultType: undefined,
    isLoaded: true,
    value: undefined,
    id: message.id,
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
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
        resultType: 'success',
        value: decode(message.result.value),
      };

    default:
      return metadata;
  }
}

function completeAwakeableV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<
  JournalEntryV2,
  { type?: 'CompleteAwakeable'; category?: 'command' }
> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const { isRetrying, error, value, resultType, relatedIndexes } =
    getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      entryJSON?.Command?.CompleteAwakeable?.result
    );

  return {
    start: entry.appended_at,
    isPending: false,
    commandIndex,
    type: 'CompleteAwakeable',
    category: 'command',
    completionId: undefined,
    end: undefined,
    index: entry.index,
    relatedIndexes,
    isRetrying,
    error,
    resultType,
    isLoaded: typeof entry.entry_json !== 'undefined',
    value,
    id: entryJSON?.Command?.CompleteAwakeable?.id,
  };
}

export function completeAwakeable(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
) {
  if (entry.version === 1 || !entry.version) {
    return completeAwakeableV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return completeAwakeableV2(entry, nextEntries, invocation);
  }

  return {};
}
