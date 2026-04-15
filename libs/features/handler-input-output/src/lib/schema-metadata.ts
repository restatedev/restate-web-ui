export type HandlerInputOutputLabel = 'Request' | 'Response';
export type HandlerSchemaPath =
  | 'input'
  | 'output'
  | `state.${string}`
  | `run.${string}`
  | `awakeable.${string}`
  | `promise.${string}`;

export interface HandlerSchemaMetadata {
  [key: `schema.state.${string}.type`]: string | undefined;
  [key: `schema.state.${string}.content_type`]:
    | 'application/protobuf'
    | 'application/json'
    | (string & {})
    | undefined;
  [key: `schema.run.${string}.type`]: string | undefined;
  [key: `schema.run.${string}.content_type`]:
    | 'application/protobuf'
    | 'application/json'
    | (string & {})
    | undefined;
  [key: `schema.awakeable.${string}.type`]: string | undefined;
  [key: `schema.awakeable.${string}.content_type`]:
    | 'application/protobuf'
    | 'application/json'
    | (string & {})
    | undefined;
  [key: `schema.promise.${string}.type`]: string | undefined;
  [key: `schema.promise.${string}.content_type`]:
    | 'application/protobuf'
    | 'application/json'
    | (string & {})
    | undefined;
  'schema.kind'?: 'protobuf' | (string & {});
  'schema.version'?: string;
  'schema.source.kind'?: 'inline' | 'url';
  'schema.source.format'?:
    | 'google.protobuf.FileDescriptorSet'
    | 'google.protobuf.FileDescriptorProto';
  'schema.source.encoding'?: 'base64' | 'json';
  'schema.source.data'?: string;
  'schema.source.url'?: string;
  'schema.input.type'?: string;
  'schema.input.content_type'?:
    | 'application/protobuf'
    | 'application/json'
    | (string & {});
  'schema.output.type'?: string;
  'schema.output.content_type'?:
    | 'application/protobuf'
    | 'application/json'
    | (string & {});
}

export type HandlerSchema = {
  kind: 'protobuf';
  displayName: string;
  contentType: string;
  messageType: string;
  source:
    | {
        kind: 'inline';
        format:
          | 'google.protobuf.FileDescriptorSet'
          | 'google.protobuf.FileDescriptorProto';
        encoding: 'base64' | 'json';
        data: string;
      }
    | {
        kind: 'url';
        encoding?: 'json';
        url: string;
      };
};

function getTypeDisplayName(messageType?: string) {
  return messageType?.split('.').at(-1) ?? 'protobuf';
}

export function getContentTypeLabel(contentType: string) {
  if (
    contentType.startsWith('one of [') ||
    contentType.startsWith('value of content-type') ||
    contentType.startsWith('JSON value of content-type')
  ) {
    try {
      let parsedContentType = contentType;
      if (contentType.startsWith('one of [')) {
        parsedContentType = JSON.parse(contentType.replace('one of ', '')).at(
          1,
        );
      }
      return (
        parsedContentType
          ?.match(/'.*'/)
          ?.at(0)
          ?.split('application/')
          .at(-1)
          ?.replace(/'/g, '') || contentType
      );
    } catch {
      return contentType;
    }
  }

  return contentType.split('application/').at(-1) ?? contentType;
}

function isProtobufContentType(contentType?: string) {
  if (!contentType) {
    return false;
  }

  return (
    contentType.includes('application/protobuf') ||
    getContentTypeLabel(contentType) === 'protobuf'
  );
}

function getSchemaSource(
  metadata?: HandlerSchemaMetadata,
): HandlerSchema['source'] | null {
  switch (metadata?.['schema.source.kind']) {
    case 'inline':
      return {
        kind: 'inline',
        format: metadata?.['schema.source.format'] as Extract<
          HandlerSchema['source'],
          { kind: 'inline' }
        >['format'],
        encoding: metadata?.['schema.source.encoding'] as Extract<
          HandlerSchema['source'],
          { kind: 'inline' }
        >['encoding'],
        data: metadata?.['schema.source.data'] as string,
      };
    case 'url':
      return {
        kind: 'url',
        encoding: metadata?.['schema.source.encoding'] as Extract<
          HandlerSchema['source'],
          { kind: 'url' }
        >['encoding'],
        url: metadata?.['schema.source.url'] as string,
      };
    default:
      return null;
  }
}

export function getHandlerSchema({
  path,
  contentType,
  metadata,
}: {
  path: HandlerSchemaPath;
  contentType: string;
  metadata?: HandlerSchemaMetadata;
}): HandlerSchema | null {
  const metadataContentType = metadata?.[`schema.${path}.content_type`];
  const resolvedContentType = metadataContentType ?? contentType;

  if (
    metadata?.['schema.kind'] !== 'protobuf' &&
    !isProtobufContentType(resolvedContentType)
  ) {
    return null;
  }

  const messageType = metadata?.[`schema.${path}.type`];
  const displayName = getTypeDisplayName(messageType);
  const source = getSchemaSource(metadata);

  if (!messageType || !source) {
    return null;
  }

  return {
    kind: 'protobuf',
    displayName,
    contentType: resolvedContentType,
    messageType,
    source,
  };
}
