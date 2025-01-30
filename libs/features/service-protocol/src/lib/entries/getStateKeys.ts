import { fromBinary } from '@bufbuild/protobuf';
import { GetStateKeysEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson } from './util';

function getStateKeysV1(entry: JournalRawEntry) {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(GetStateKeysEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        keys: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: entry.completed ?? true,
      };
    case 'value':
      return {
        name: message.name,
        keys: message.result.value.keys.map(decode),
        failure: undefined,
        completed: entry.completed ?? true,
      };
    default:
      return {
        name: message.name,
        keys: undefined,
        failure: undefined,
        completed: entry.completed,
      };
  }
}

function getStateKeysV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  return {
    name: entryJSON?.Command?.GetEagerStateKeys?.name,
    keys: entryJSON?.Command?.GetEagerStateKeys?.state_keys,
    start: entry.appended_at,
    completed: entry.completed ?? true,
    // TODO display failure
    failure: undefined,
  };
}

export function getStateKeys(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  start?: string;
  completed?: boolean;
  failure?: RestateError;
  keys?: string[];
} {
  if (entry.version === 1) {
    return getStateKeysV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return getStateKeysV2(entry, allEntries);
  }

  return {};
}
