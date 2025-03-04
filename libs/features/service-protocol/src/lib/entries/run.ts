import { fromBinary } from '@bufbuild/protobuf';
import { RunEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseResults, parseEntryJson, findEntryAfter } from './util';

function runV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(RunEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: true,
      };
    case 'value':
      return {
        name: message.name,
        value: decode(message.result.value),
        failure: undefined,
        completed: true,
      };
    default:
      return {
        name: message.name,
        value: undefined,
        failure: undefined,
        completed: true,
      };
  }
}

function runV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const completedId = entryJSON?.Command?.Run?.completion_id;
  // TODO: display canceled runs
  // TODO: display Failure results
  /**
   * If there is no completionEntry, either it's still in progress
   * or it has been failed. The error can be find in the invocation.
   */
  const { entryJSON: completionEntryJson, entry: completionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.Run?.completion_id ===
        completedId;

      return isCompletionEntry;
    });
  const completionEntryResult =
    completionEntryJson?.Notification?.Completion?.Run?.result;

  return {
    name: entryJSON?.Command?.Run?.name,
    completed: Boolean(completionEntry),
    ...parseResults(completionEntryResult),
    start: entry?.appended_at,
    end: completionEntry?.appended_at,
  };
}

export function run(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  value?: string;
  start?: string;
  end?: string;
  completed?: boolean;
  failure?: RestateError;
} {
  if (entry.version === 1 || !entry.version) {
    return runV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return runV2(entry, allEntries);
  }

  return {};
}
