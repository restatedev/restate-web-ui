import { fromBinary } from '@bufbuild/protobuf';
import { SleepEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { RestateError } from '@restate/util/errors';

export function sleep(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(SleepEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'empty':
      return {
        name: message.name,
        fired: true,
        failure: undefined,
      };
    case 'failure':
      return {
        name: message.name,
        fired: false,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
      };

    default:
      return {
        name: message.name,
        fired: false,
        failure: undefined,
      };
  }
}
