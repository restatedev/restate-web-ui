import { fromBinary } from '@bufbuild/protobuf';
import { AwakeableEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import {
  getCompletionEntry,
  getEntryResultV2,
  getLastFailureV1,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

function awakeableV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Awakeable'; category?: 'command' }> {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(AwakeableEntryMessageSchema, toUnit8Array(raw));
  const error = getLastFailureV1(entry, invocation);

  const metadata = {
    id: undefined,
    start: undefined,
    isPending: !entry.completed,
    commandIndex: entry.index,
    type: 'Awakeable',
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
  } as const;

  switch (message.result.case) {
    case 'failure':
      return {
        ...metadata,
        error: message.result.value.message
          ? new RestateError(
              message.result.value.message,
              message.result.value.code.toString(),
            )
          : error,
        resultType: 'failure',
      };
    case 'value':
      return {
        ...metadata,
        value: decode(message.result.value),
        resultType: 'failure',
      };
    default:
      return metadata;
  }
}

function awakeableV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
): Extract<JournalEntryV2, { type?: 'Awakeable'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const commandIndex = entry.command_index;

  const completionId = entryJSON?.Command?.Awakeable?.completion_id;
  const completionEntry = getCompletionEntry<
    Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'notification' }
    >
  >(completionId, 'Awakeable', nextEntries);

  const { isRetrying, error, relatedIndexes } = getEntryResultV2(
    entry,
    invocation,
    nextEntries,
    undefined,
    [completionEntry?.index],
  );

  return {
    id: undefined,
    start: entry.appended_at,
    isPending: !completionEntry,
    commandIndex,
    type: 'Awakeable',
    category: 'command',
    completionId,
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

export function awakeable(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
) {
  if (entry.version === 1 || !entry.version) {
    return awakeableV1(entry, invocation);
  }

  if (entry.version === 2 && (entry.entry_json || entry.entry_lite_json)) {
    return awakeableV2(entry, nextEntries, invocation);
  }

  return {};
}
