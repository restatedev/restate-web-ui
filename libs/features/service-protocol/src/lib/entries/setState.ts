import { fromBinary } from '@bufbuild/protobuf';
import { SetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { decodeBinary, parseEntryJson } from './util';

function setStateV1(entry: JournalRawEntry) {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(SetStateEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: decode(message.key),
    value: decode(message.value),
  };
}

function setStateV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const key = entryJSON?.Command?.SetState?.key;
  const value = entryJSON?.Command?.SetState?.value;

  return {
    name: entryJSON?.Command?.SetState?.name,
    key,
    value: decodeBinary(value),
  };
}

export function setState(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1) {
    return setStateV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return setStateV2(entry, allEntries);
  }

  return {};
}
