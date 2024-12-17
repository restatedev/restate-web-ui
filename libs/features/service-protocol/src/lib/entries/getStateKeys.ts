import { fromBinary } from '@bufbuild/protobuf';
import { GetStateKeysEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';

export function getStateKeys(raw: string) {
  const message = fromBinary(GetStateKeysEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        keys: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };
    case 'value':
      return {
        name: message.name,
        keys: message.result.value.keys.map(decode),
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        keys: undefined,
        failure: undefined,
      };
  }
}
