import {
  createFileRegistry,
  fromBinary,
  fromJson,
  toBinary,
  toJson,
} from '@bufbuild/protobuf';
import type { DescMessage, FileRegistry, JsonValue } from '@bufbuild/protobuf';
import {
  FileDescriptorSetSchema,
  type FileDescriptorSet,
} from '@bufbuild/protobuf/wkt';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';
import type {
  ProtobufCodec,
  ProtobufDecodeOptions,
  ProtobufEncodeOptions,
  ProtobufSchema,
  ProtobufTypeRef,
} from './types';

/**
 * Accepts either protobuf type-name form and normalizes it for registry lookup.
 *
 * @example
 * normalizeMessageType('.google.protobuf.Timestamp')
 * // => 'google.protobuf.Timestamp'
 */
function normalizeMessageType(messageType: string) {
  return messageType.startsWith('.') ? messageType.slice(1) : messageType;
}

/**
 * Chooses how to parse a schema URL response.
 *
 * Explicit `schema.format` wins. Otherwise we infer from the response
 * content-type or a `.json` file extension.
 */
function inferSchemaFormat(
  schema: Extract<ProtobufSchema, { type: 'url' }>,
  contentType: string | null,
) {
  if (schema.format) {
    return schema.format;
  }

  if (contentType?.toLowerCase().includes('json')) {
    return 'json' as const;
  }

  const normalizedUrl = schema.url.split('#')[0]?.split('?')[0] ?? schema.url;
  if (normalizedUrl.toLowerCase().endsWith('.json')) {
    return 'json' as const;
  }

  return 'binary' as const;
}

/**
 * Fetches a descriptor set from a URL and parses it as binary or JSON.
 */
async function loadFileDescriptorSetFromUrl(
  schema: Extract<ProtobufSchema, { type: 'url' }>,
): Promise<FileDescriptorSet> {
  const response = await fetch(schema.url, schema.fetchInit);

  if (!response.ok) {
    throw new Error(
      `Failed to load protobuf schema from "${schema.url}": ${response.status} ${response.statusText}`,
    );
  }

  const format = inferSchemaFormat(
    schema,
    response.headers.get('content-type'),
  );

  if (format === 'json') {
    return fromJson(
      FileDescriptorSetSchema,
      (await response.json()) as JsonValue,
    );
  }

  return fromBinary(
    FileDescriptorSetSchema,
    new Uint8Array(await response.arrayBuffer()),
  );
}

/**
 * Accepts either a parsed `FileDescriptorSet` or its binary representation.
 */
function normalizeFileDescriptorSet(
  schema: Extract<ProtobufSchema, { type: 'descriptor-set' }>,
): FileDescriptorSet {
  if (schema.fileDescriptorSet instanceof Uint8Array) {
    return fromBinary(FileDescriptorSetSchema, schema.fileDescriptorSet);
  }

  return schema.fileDescriptorSet;
}

/**
 * Builds a protobuf registry from any supported schema source.
 */
async function loadRegistry(schema: ProtobufSchema): Promise<FileRegistry> {
  switch (schema.type) {
    case 'url':
      return createFileRegistry(await loadFileDescriptorSetFromUrl(schema));
    case 'descriptor-set':
      return createFileRegistry(normalizeFileDescriptorSet(schema));
    case 'descriptor':
      return createFileRegistry(schema.fileDescriptor, (fileName: string) =>
        schema.resolveImport?.(fileName),
      );
  }
}

/**
 * Resolves the target message descriptor and keeps the registry alongside it so
 * JSON conversion can still resolve dependent types like `Any`.
 */
async function resolveMessageDescriptor(typeRef: ProtobufTypeRef): Promise<{
  registry: FileRegistry;
  messageDescriptor: DescMessage;
}> {
  const registry = await loadRegistry(typeRef.schema);
  const messageType = normalizeMessageType(typeRef.messageType);
  const messageDescriptor = registry.getMessage(messageType);

  if (!messageDescriptor) {
    throw new Error(
      `Message type "${typeRef.messageType}" was not found in the provided protobuf schema`,
    );
  }

  return {
    registry,
    messageDescriptor,
  };
}

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
