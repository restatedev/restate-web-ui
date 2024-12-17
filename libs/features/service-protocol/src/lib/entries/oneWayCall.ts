import { fromBinary } from '@bufbuild/protobuf';
import { OneWayCallEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { decode } from '../decoder';

export function oneWayCall(raw?: string) {
  if (!raw) {
    return {};
  }
  const message = fromBinary(OneWayCallEntryMessageSchema, toUnit8Array(raw));
  return {
    name: message.name,
    key: message.key,
    serviceName: message.serviceName,
    handlerName: message.handlerName,
    parameters: decode(message.parameter),
    headers: message.headers.map(({ key, value }) => ({ key, value })),
    invokeTime: message.invokeTime
      ? new Date(Number(message.invokeTime)).toISOString()
      : undefined,
  };
}
