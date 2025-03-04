import { fromBinary } from '@bufbuild/protobuf';
import { GetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseResults, parseEntryJson } from './util';

function getStateV1(entry: JournalRawEntry) {
  const { raw } = entry;

  if (!raw) {
    return {};
  }
  const message = fromBinary(GetStateEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'empty':
      return {
        name: message.name,
        key: decode(message.key),
        value: undefined,
        failure: undefined,
        completed: entry.completed ?? true,
      };
    case 'failure':
      return {
        name: message.name,
        key: decode(message.key),
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: entry.completed ?? true,
      };
    case 'value':
      return {
        name: message.name,
        key: decode(message.key),
        value: decode(message.result.value),
        failure: undefined,
        completed: entry.completed ?? true,
      };
    default:
      return {
        name: message.name,
        key: decode(message.key),
        value: undefined,
        failure: undefined,
        completed: entry.completed,
      };
  }
}

function getStateV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const result = entryJSON?.Command?.GetEagerState?.result;
  return {
    name: entryJSON?.Command?.GetEagerState?.name,
    ...parseResults(result),
    key: entryJSON?.Command?.GetEagerState?.key,
    start: entry.appended_at,
    completed: entry.completed ?? true,
  };
}

export function getState(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  start?: string;
  completed?: boolean;
  failure?: RestateError;
  key?: string;
  value?: string;
} {
  if (entry.version === 1 || !entry.version) {
    return getStateV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return getStateV2(entry, allEntries);
  }

  return {};
}
