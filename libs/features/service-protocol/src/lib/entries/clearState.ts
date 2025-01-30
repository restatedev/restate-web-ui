import { fromBinary } from '@bufbuild/protobuf';
import { ClearStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson } from './util';

function clearStateV1(entry: JournalRawEntry) {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(ClearStateEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: decode(message.key),
    completed: true,
  };
}

function clearStateV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);

  return {
    name: entryJSON?.Command?.ClearState?.name,
    key: entryJSON?.Command?.ClearState?.key,
    start: entry.appended_at,
    completed: true,
  };
}

export function clearState(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1) {
    return clearStateV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return clearStateV2(entry, allEntries);
  }

  return {};
}
