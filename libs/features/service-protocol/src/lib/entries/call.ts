import { fromBinary } from '@bufbuild/protobuf';
import { CallEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import {
  decodeBinary,
  parseResults,
  getTarget,
  parseEntryJson,
  findEntryAfter,
} from './util';

export function callV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(CallEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        key: message.key,
        serviceName: message.serviceName,
        handlerName: message.handlerName,
        parameters: decode(message.parameter),
        headers: message.headers.map(({ key, value }) => ({ key, value })),
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        completed: entry.completed,
        invoked_id: entry.invoked_id,
        invoked_target: entry.invoked_target,
      };
    case 'value':
      return {
        name: message.name,
        key: message.key,
        serviceName: message.serviceName,
        handlerName: message.handlerName,
        parameters: decode(message.parameter),
        headers: message.headers.map(({ key, value }) => ({ key, value })),
        value: decode(message.result.value),
        failure: undefined,
        completed: entry.completed,
        invoked_id: entry.invoked_id,
        invoked_target: entry.invoked_target,
      };
    default:
      return {
        name: message.name,
        key: message.key,
        serviceName: message.serviceName,
        handlerName: message.handlerName,
        parameters: decode(message.parameter),
        headers: message.headers.map(({ key, value }) => ({ key, value })),
        value: undefined,
        failure: undefined,
        completed: entry.completed,
        invoked_id: entry.invoked_id,
        invoked_target: entry.invoked_target,
      };
  }
}

function callV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const resultCompletionId = entryJSON?.Command?.Call?.result_completion_id;
  const invoked_id = entryJSON?.Command?.Call?.request?.invocation_id;
  const { name, key, handler } = getTarget(
    entryJSON?.Command?.Call?.request?.invocation_target
  );
  const invoked_target = [name, key, handler]
    .filter((v) => typeof v === 'string')
    .join('/');
  const headers = entryJSON?.Command?.Call?.request?.headers;
  const parameters = entryJSON?.Command?.Call?.request?.parameter;
  // TODO: display canceled runs
  // TODO: display Failure results
  /**
   * If there is no completionEntry, either it's still in progress
   * or it has been failed. The error can be find in the invocation.
   */
  const { entryJSON: resultCompletionEntryJson, entry: resultCompletionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.Call?.completion_id ===
        resultCompletionId;

      return isCompletionEntry;
    });

  const completionEntryResult =
    resultCompletionEntryJson?.Notification?.Completion?.Call?.result;

  return {
    name: entryJSON?.Command?.Run?.name,
    completed: Boolean(resultCompletionEntry),
    ...parseResults(completionEntryResult),
    start: entry?.appended_at,
    end: resultCompletionEntry?.appended_at,
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
  };
}

export function call(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  value?: string;
  start?: string;
  end?: string;
  parameters?: string;
  completed?: boolean;
  failure?: RestateError;
  headers?: {
    key: string;
    value: string;
  }[];
  invoked_id?: string;
  invoked_target?: string;
  handlerName?: string;
  serviceName?: string;
  key?: string;
} {
  if (entry.version === 1) {
    return callV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return callV2(entry, allEntries);
  }

  return {};
}
