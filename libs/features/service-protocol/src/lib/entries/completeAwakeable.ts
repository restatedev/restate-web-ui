import { fromBinary } from '@bufbuild/protobuf';
import { CompleteAwakeableEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseResults, parseEntryJson } from './util';

function completeAwakeableV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    CompleteAwakeableEntryMessageSchema,
    toUnit8Array(raw)
  );
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        id: message.id,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };
    case 'value':
      return {
        name: message.name,
        id: message.id,
        value: decode(message.result.value),
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        id: message.id,
        value: undefined,
        failure: undefined,
      };
  }
}

function completeAwakeableV2(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  const entryJSON = parseEntryJson(entry.entry_json);

  const result = entryJSON?.Command?.CompleteAwakeable?.result;

  return {
    name: entryJSON?.Command?.CompleteAwakeable?.name,
    ...parseResults(result),
    start: entry?.appended_at,
  };
}

export function completeAwakeable(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1 || !entry.version) {
    return completeAwakeableV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return completeAwakeableV2(entry, allEntries);
  }

  return {};
}
