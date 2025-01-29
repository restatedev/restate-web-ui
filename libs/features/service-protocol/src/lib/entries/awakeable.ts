import { fromBinary } from '@bufbuild/protobuf';
import { AwakeableEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson } from './util';

function awakeableV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(AwakeableEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: entry.completed,
      };
    case 'value':
      return {
        name: message.name,
        value: decode(message.result.value),
        failure: undefined,
        completed: entry.completed,
      };
    default:
      return {
        name: message.name,
        value: undefined,
        failure: undefined,
        completed: entry.completed,
      };
  }
}

function awakeableV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);

  return {
    name: entryJSON?.Command?.Run?.name,
    start: entry?.appended_at,
    failure: undefined,
  };
}

export function awakeable(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1) {
    return awakeableV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return awakeableV2(entry, allEntries);
  }

  return {};
}
