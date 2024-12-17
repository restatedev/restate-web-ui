import { fromBinary } from '@bufbuild/protobuf';
import { GetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';

export function getState(raw: string) {
  const message = fromBinary(GetStateEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'empty':
      return {
        name: message.name,
        key: decode(message.key),
        value: undefined,
        failure: undefined,
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
      };
    case 'value':
      return {
        name: message.name,
        key: decode(message.key),
        value: decode(message.result.value),
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        key: decode(message.key),
        value: undefined,
        failure: undefined,
      };
  }
}
