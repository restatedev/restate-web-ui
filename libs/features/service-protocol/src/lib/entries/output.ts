import { fromBinary } from '@bufbuild/protobuf';
import { OutputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson, parseResults } from './util';

function outputV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(OutputEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        body: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: true,
      };
    case 'value':
      return {
        name: message.name,
        body: decode(message.result.value),
        failure: undefined,
        completed: true,
      };
    default:
      return {
        name: message.name,
        body: undefined,
        failure: undefined,
        completed: true,
      };
  }
}

function outputV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const { value, failure } = parseResults(entryJSON.Command.Output.result);
  return {
    name: entryJSON?.Command?.Output?.name,
    body: value,
    failure,
    start: entry.appended_at,
    completed: true,
  };
}

export function output(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  if (entry.version === 1) {
    return outputV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return outputV2(entry, allEntries);
  }

  return {};
}
