import { fromBinary } from '@bufbuild/protobuf';
import { ClearStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';

export function clearState(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(ClearStateEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: decode(message.key),
  };
}
