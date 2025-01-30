import { fromBinary } from '@bufbuild/protobuf';
import { GetPromiseEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { findEntryAfter, parseEntryJson, parseResults } from './util';

function getPromiseV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(GetPromiseEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
    case 'value':
      return {
        name: message.name,
        value: decode(message.result.value),
        failure: undefined,
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
    default:
      return {
        name: message.name,
        value: undefined,
        failure: undefined,
        promise_name: entry.promise_name,
        completed: entry.completed,
      };
  }
}

function getPromiseV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const completedId = entryJSON?.Command?.GetPromise?.completion_id;

  const { entryJSON: completionEntryJson, entry: completionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.GetPromise?.completion_id ===
        completedId;

      return isCompletionEntry;
    });
  const completionEntryResult =
    completionEntryJson?.Notification?.Completion?.GetPromise?.result;

  return {
    name: entryJSON?.Command?.GetPromise?.key,
    start: entry?.appended_at,
    completed: Boolean(completionEntry),
    ...parseResults(completionEntryResult),
    end: completionEntry?.appended_at,
    promise_name: entryJSON?.Command?.GetPromise?.key,
  };
}

export function getPromise(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1) {
    return getPromiseV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return getPromiseV2(entry, allEntries);
  }

  return {};
}
