import { fromBinary } from '@bufbuild/protobuf';
import { AwakeableEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';
import { RestateError } from '@restate/util/errors';

export function awakeable(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(AwakeableEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'failure':
      return {
        name: message.name,
        value: undefined,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };
    case 'value':
      return {
        name: message.name,
        value: decode(message.result.value),
        failure: undefined,
      };
    default:
      return {
        name: message.name,
        value: undefined,
        failure: undefined,
      };
  }
}
