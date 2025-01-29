import { fromBinary } from '@bufbuild/protobuf';
import { InputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { decodeBinary, parseEntryJson } from './util';

function inputV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(InputEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    body: decode(message.value),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
    start: undefined,
    completed: true,
    failure: undefined,
  };
}

function inputV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  return {
    name: entryJSON?.Command?.Input?.name,
    body: decodeBinary(entryJSON.Command.Input.payload),
    headers: entryJSON?.Command?.Input?.headers?.map(
      ({ name, value }: { name: string; value: string }) =>
        ({
          key: name,
          value,
        } as { key: string; value: string })
    ),
    start: entry.appended_at,
    completed: true,
    failure: undefined,
  };
}

export function input(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  body?: string;
  headers?: {
    key: string;
    value: string;
  }[];
  start?: string;
  completed?: boolean;
  failure?: undefined;
} {
  if (entry.version === 1) {
    return inputV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return inputV2(entry, allEntries);
  }

  return {};
}
