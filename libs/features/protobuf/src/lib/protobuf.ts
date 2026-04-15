import { fromBinary, fromJson, toBinary, toJson } from '@bufbuild/protobuf';
import type { JsonValue } from '@bufbuild/protobuf';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';
import { resolveMessageDescriptor } from './schema';
import type {
  ProtobufCodec,
  ProtobufDecodeOptions,
  ProtobufEncodeOptions,
  ProtobufTypeRef,
} from './types';

/**
 * Normalizes payload input into raw protobuf bytes.
 *
 * Strings are treated as base64 because JavaScript strings are not a safe
 * transport for arbitrary binary data.
 */
function payloadToBytes(
  payload: Uint8Array | string,
  payloadEncoding?: ProtobufDecodeOptions['payloadEncoding'],
) {
  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (payloadEncoding === 'binary') {
    throw new Error(
      'String protobuf payloads are only supported with base64 encoding',
    );
  }

  return base64ToUint8Array(payload);
}

/**
 * Returns raw bytes by default, or base64 when requested by the caller.
 */
function bytesToOutput(
  bytes: Uint8Array,
  outputEncoding?: ProtobufEncodeOptions['outputEncoding'],
) {
  if (outputEncoding === 'base64') {
    return bytesToBase64(bytes);
  }

  return bytes;
}

/**
 * Loads schema metadata and returns a reusable codec for one protobuf message.
 *
 * This is the best entry point when multiple payloads share the same schema and
 * message type because descriptor resolution only happens once.
 *
 * @example
 * const codec = await loadProtobufCodec({
 *   schema: { type: 'url', url: '/schema.bin' },
 *   messageType: 'my.package.OrderCreated',
 * });
 *
 * const json = codec.decode(payloadBytes);
 * const bytes = codec.encode(json);
 */
export async function loadProtobufCodec(
  typeRef: ProtobufTypeRef,
): Promise<ProtobufCodec> {
  const { registry, messageDescriptor } =
    await resolveMessageDescriptor(typeRef);

  return {
    messageType: messageDescriptor.typeName,
    decode(payload, options) {
      const message = fromBinary(
        messageDescriptor,
        payloadToBytes(payload, options?.payloadEncoding),
      );

      return toJson(messageDescriptor, message, {
        alwaysEmitImplicit: options?.emitDefaultValues,
        enumAsInteger: options?.enumAsInteger,
        registry,
        useProtoFieldName: options?.useProtoFieldName,
      });
    },
    encode(message, options) {
      const encodedMessage = fromJson(messageDescriptor, message, {
        ignoreUnknownFields: options?.ignoreUnknownFields,
        registry,
      });

      return bytesToOutput(
        toBinary(messageDescriptor, encodedMessage),
        options?.outputEncoding,
      );
    },
  };
}

/**
 * One-shot decode helper for callers that do not need a reusable codec.
 *
 * @example
 * const json = await decodeProtobuf(typeRef, payloadBase64, {
 *   payloadEncoding: 'base64',
 * });
 */
export async function decodeProtobuf(
  typeRef: ProtobufTypeRef,
  payload: Uint8Array | string,
  options?: ProtobufDecodeOptions,
): Promise<JsonValue> {
  const codec = await loadProtobufCodec(typeRef);
  return codec.decode(payload, options);
}

/**
 * One-shot encode helper for callers that do not need a reusable codec.
 *
 * @example
 * const payload = await encodeProtobuf(typeRef, jsonMessage, {
 *   outputEncoding: 'base64',
 * });
 */
export async function encodeProtobuf(
  typeRef: ProtobufTypeRef,
  message: JsonValue,
  options?: ProtobufEncodeOptions,
): Promise<Uint8Array | string> {
  const codec = await loadProtobufCodec(typeRef);
  return codec.encode(message, options);
}
