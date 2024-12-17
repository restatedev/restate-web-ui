import { fromBinary } from '@bufbuild/protobuf';
import { ClearAllStateEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';

export function clearAllState(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(
    ClearAllStateEntryMessageSchema,
    toUnit8Array(raw)
  );
  return {
    name: message.name,
  };
}
