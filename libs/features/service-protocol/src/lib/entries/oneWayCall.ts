import { fromBinary } from '@bufbuild/protobuf';
import { OneWayCallEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { decodeBinary, getTarget, parseEntryJson } from './util';

function oneWayCallV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(OneWayCallEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: message.key,
    serviceName: message.serviceName,
    handlerName: message.handlerName,
    parameters: decode(message.parameter),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
    invokeTime: message.invokeTime
      ? new Date(Number(message.invokeTime)).toISOString()
      : undefined,
    completed: entry.completed,
    invoked_id: entry.invoked_id,
    invoked_target: entry.invoked_target,
  };
}

function oneWayCallV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const invoked_id = entryJSON?.Command?.OneWayCall?.request?.invocation_id;
  const { name, key, handler } = getTarget(
    entryJSON?.Command?.OneWayCall?.request?.invocation_target
  );
  const invoked_target = [name, key, handler]
    .filter((v) => typeof v === 'string')
    .join('/');
  const headers = entryJSON?.Command?.OneWayCall?.request?.headers;
  const parameters = entryJSON?.Command?.OneWayCall?.request?.parameter;
  const invokeTimeValue = entryJSON?.Command?.OneWayCall?.invoke_time;
  const invokeTime = invokeTimeValue
    ? new Date(invokeTimeValue).toISOString()
    : undefined;

  return {
    name: entryJSON?.Command?.Run?.name,
    completed: entry.completed,
    start: entry?.appended_at,
    failure: undefined,
    invoked_id,
    invoked_target,
    headers: headers?.map(
      ({ name, value }: { name: string; value: string }) =>
        ({
          key: name,
          value,
        } as { key: string; value: string })
    ),
    parameters: decodeBinary(parameters),
    handlerName: handler,
    serviceName: name,
    key,
    invokeTime,
  };
}

export function oneWayCall(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 1 || !entry.version) {
    return oneWayCallV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return oneWayCallV2(entry, allEntries);
  }

  return {};
}
