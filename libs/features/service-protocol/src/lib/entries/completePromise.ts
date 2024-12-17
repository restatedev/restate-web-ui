import { fromBinary } from '@bufbuild/protobuf';
import {
  CompletePromiseEntryMessage,
  CompletePromiseEntryMessageSchema,
} from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';

function getCompletion(completion: CompletePromiseEntryMessage['completion']) {
  switch (completion.case) {
    case 'completionFailure':
      return {
        value: undefined,
        failure: new RestateError(
          completion.value.message,
          completion.value.code.toString()
        ),
      };
    case 'completionValue':
      return {
        value: decode(completion.value),
        failure: undefined,
      };
    default:
      return {
        value: undefined,
        failure: undefined,
      };
  }
}

export function completePromise(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    CompletePromiseEntryMessageSchema,
    toUnit8Array(raw)
  );
  const completion = getCompletion(message.completion);
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        key: message.key,
        completion,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };
    case 'empty':
      return {
        name: message.name,
        key: message.key,
        completion,
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        key: message.key,
        completion,
        failure: undefined,
      };
  }
}
