import { fromBinary } from '@bufbuild/protobuf';
import {
  CompletePromiseEntryMessage,
  CompletePromiseEntryMessageSchema,
} from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { findEntryAfter, parseEntryJson, parseResults } from './util';

function getCompletion(completion: CompletePromiseEntryMessage['completion']) {
  switch (completion.case) {
    case 'completionFailure':
      return {
        value: undefined,
        failure: new RestateError(
          completion.value.message,
          completion.value.code.toString()
        ),
      };
    case 'completionValue':
      return {
        value: decode(completion.value),
        failure: undefined,
      };
    default:
      return {
        value: undefined,
        failure: undefined,
      };
  }
}

function completePromiseV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    CompletePromiseEntryMessageSchema,
    toUnit8Array(raw)
  );
  const completion = getCompletion(message.completion);
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        completion,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
    case 'empty':
      return {
        name: message.name,
        completion,
        failure: undefined,
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
    default:
      return {
        name: message.name,
        completion,
        failure: undefined,
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
  }
}

function completePromiseV2(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const completedId = entryJSON?.Command?.CompletePromise?.completion_id;

  const { entryJSON: completionEntryJson, entry: completionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.CompletePromise
          ?.completion_id === completedId;

      return isCompletionEntry;
    });

  return {
    name: entryJSON?.Command?.CompletePromise?.key,
    start: entry?.appended_at,
    completed: Boolean(completionEntry),
    completion: parseResults(entryJSON?.Command?.CompletePromise?.value),
    end: completionEntry?.appended_at,
    promise_name: entryJSON?.Command?.CompletePromise?.key,
  };
}

export function completePromise(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1) {
    return completePromiseV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return completePromiseV2(entry, allEntries);
  }

  return {};
}
