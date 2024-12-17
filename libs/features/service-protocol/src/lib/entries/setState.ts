import { fromBinary } from '@bufbuild/protobuf';
import { SetStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';

export function setState(raw: string) {
  const message = fromBinary(SetStateEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: decode(message.key),
    value: decode(message.value),
  };
}
