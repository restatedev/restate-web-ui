import {
  createFileRegistry,
  fromBinary,
  fromJson,
} from '@bufbuild/protobuf';
import type { DescMessage, FileRegistry, JsonValue } from '@bufbuild/protobuf';
import {
  FileDescriptorSetSchema,
  type FileDescriptorSet,
} from '@bufbuild/protobuf/wkt';
import type { ProtobufSchema, ProtobufTypeRef } from './types';

/**
 * Accepts either protobuf type-name form and normalizes it for registry lookup.
 *
 * @example
 * normalizeMessageType('.google.protobuf.Timestamp')
 * // => 'google.protobuf.Timestamp'
 */
export function normalizeMessageType(messageType: string) {
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
export async function resolveMessageDescriptor(typeRef: ProtobufTypeRef): Promise<{
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
