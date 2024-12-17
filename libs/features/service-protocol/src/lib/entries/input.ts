import { fromBinary } from '@bufbuild/protobuf';
import { InputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';

export function input(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(InputEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    value: decode(message.value),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
  };
}
