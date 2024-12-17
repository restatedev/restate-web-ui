import { fromBinary } from '@bufbuild/protobuf';
import { PeekPromiseEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';

export function peekPromise(raw: string) {
  const message = fromBinary(PeekPromiseEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        key: message.key,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };
    case 'value':
      return {
        name: message.name,
        key: message.key,
        value: decode(message.result.value),
        failure: undefined,
      };
    case 'empty':
      return {
        name: message.name,
        key: message.key,
        value: undefined,
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        key: message.key,
        value: undefined,
        failure: undefined,
      };
  }
}
