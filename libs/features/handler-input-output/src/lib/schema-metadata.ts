export type HandlerInputOutputLabel = 'Request' | 'Response';
type HandlerSchemaPath =
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

interface JsonSchemaLike {
  title?: string;
  type?: string | string[];
  anyOf?: unknown;
}

export type HandlerProtobufSchema = {
  kind: 'protobuf';
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

export type HandlerSchema =
  | {
      kind: 'hidden';
    }
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'protobuf-popover';
      triggerLabel: string;
      title: string;
      protobufSchema: HandlerProtobufSchema;
    }
  | {
      kind: 'json-schema-popover';
      triggerLabel: string;
      title: string;
      jsonSchema: JsonSchemaLike;
    }
  | {
      kind: 'content-type-popover';
      triggerLabel: string;
      title: string;
      contentType: string;
    };

type HandlerSchemaKind =
  // No payload for this surface, so the request row renders nothing.
  | 'hidden'
  // A simple inline label like `string` is enough; no popover needed.
  | 'text'
  // Show a popover with protobuf schema source rendered as `.proto`.
  | 'protobuf-popover'
  // Show a popover with the JSON schema viewer for object-like schemas.
  | 'json-schema-popover'
  // Fallback popover that only shows the resolved content type.
  | 'content-type-popover';

interface HandlerSchemaRenderContext {
  contentType: string;
  defaultTriggerLabel: string;
  displayName?: string;
  hasJsonObjectSchema: boolean;
  jsonSchema?: JsonSchemaLike;
  label: HandlerInputOutputLabel;
  protobufSchema: HandlerProtobufSchema | null;
}

/**
 * Narrows an unknown handler schema payload into the JSON-schema-like shape
 * used by the input/output viewer.
 *
 * @example
 * getJsonSchema({ title: 'User', type: 'object' })
 * // => { title: 'User', type: 'object' }
 *
 * @example
 * getJsonSchema('not-a-schema')
 * // => undefined
 */
function getJsonSchema(schema?: unknown) {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  return schema as JsonSchemaLike;
}

/**
 * Extracts the last segment from a fully-qualified protobuf message name.
 *
 * @example
 * getProtobufMessageDisplayName('examples.protobuf.v1.GreetRequest')
 * // => 'GreetRequest'
 */
function getProtobufMessageDisplayName(messageType: string) {
  return messageType.split('.').at(-1) ?? 'protobuf';
}

/**
 * Normalizes content-type strings into the short label shown in the UI.
 *
 * @example
 * getContentTypeDisplayName('application/json')
 * // => 'json'
 *
 * @example
 * getContentTypeDisplayName("value of content-type header 'application/protobuf'")
 * // => 'protobuf'
 */
function getContentTypeDisplayName(contentType: string) {
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

/**
 * Detects whether a content type should be treated as protobuf by the viewer.
 *
 * @example
 * isProtobufContentType('application/protobuf')
 * // => true
 *
 * @example
 * isProtobufContentType('application/json')
 * // => false
 */
function isProtobufContentType(contentType?: string) {
  if (!contentType) {
    return false;
  }

  return (
    contentType.includes('application/protobuf') ||
    getContentTypeDisplayName(contentType) === 'protobuf'
  );
}

/**
 * Extracts the protobuf schema source information from handler metadata.
 *
 * @example
 * getProtobufSchemaSource({
 *   'schema.source.kind': 'inline',
 *   'schema.source.format': 'google.protobuf.FileDescriptorSet',
 *   'schema.source.encoding': 'base64',
 *   'schema.source.data': 'Zm9v',
 * })
 * // => { kind: 'inline', format: 'google.protobuf.FileDescriptorSet', encoding: 'base64', data: 'Zm9v' }
 *
 * @example
 * getProtobufSchemaSource({
 *   'schema.source.kind': 'url',
 *   'schema.source.url': 'https://example.com/schema.bin',
 * })
 * // => { kind: 'url', url: 'https://example.com/schema.bin', encoding: undefined }
 */
function getProtobufSchemaSource(
  metadata?: HandlerSchemaMetadata,
): HandlerProtobufSchema['source'] | null {
  switch (metadata?.['schema.source.kind']) {
    case 'inline':
      return {
        kind: 'inline',
        format: metadata?.['schema.source.format'] as Extract<
          HandlerProtobufSchema['source'],
          { kind: 'inline' }
        >['format'],
        encoding: metadata?.['schema.source.encoding'] as Extract<
          HandlerProtobufSchema['source'],
          { kind: 'inline' }
        >['encoding'],
        data: metadata?.['schema.source.data'] as string,
      };
    case 'url':
      return {
        kind: 'url',
        encoding: metadata?.['schema.source.encoding'] as Extract<
          HandlerProtobufSchema['source'],
          { kind: 'url' }
        >['encoding'],
        url: metadata?.['schema.source.url'] as string,
      };
    default:
      return null;
  }
}

/**
 * Builds the protobuf-specific part of the handler schema when the metadata
 * indicates protobuf input/output.
 *
 * @example
 * getHandlerProtobufSchema({
 *   path: 'input',
 *   contentType: 'application/protobuf',
 *   metadata: {
 *     'schema.kind': 'protobuf',
 *     'schema.source.kind': 'url',
 *     'schema.source.url': 'https://example.com/schema.bin',
 *     'schema.input.type': 'examples.v1.GreetRequest',
 *   },
 * })
 * // => { kind: 'protobuf', contentType: 'application/protobuf', messageType: 'examples.v1.GreetRequest', source: { kind: 'url', url: 'https://example.com/schema.bin' } }
 */
function getHandlerProtobufSchema({
  path,
  contentType,
  metadata,
}: {
  path: HandlerSchemaPath;
  contentType: string;
  metadata?: HandlerSchemaMetadata;
}): HandlerProtobufSchema | null {
  const metadataContentType = metadata?.[`schema.${path}.content_type`];
  const resolvedContentType = metadataContentType ?? contentType;

  if (
    metadata?.['schema.kind'] !== 'protobuf' &&
    !isProtobufContentType(resolvedContentType)
  ) {
    return null;
  }

  const messageType = metadata?.[`schema.${path}.type`];
  const source = getProtobufSchemaSource(metadata);

  if (!messageType || !source) {
    return null;
  }

  return {
    kind: 'protobuf',
    contentType: resolvedContentType,
    messageType,
    source,
  };
}

/**
 * Collects the shared state used to decide how a handler input/output should
 * render.
 *
 * @example
 * getHandlerSchemaRenderContext({
 *   schema: { title: 'User', type: 'object' },
 *   contentType: 'application/json',
 *   label: 'Response',
 * })
 * // => context used to derive a json-schema popover
 */
function getHandlerSchemaRenderContext({
  schema,
  contentType,
  label,
  metadata,
}: {
  schema?: unknown;
  contentType: string;
  label: HandlerInputOutputLabel;
  metadata?: HandlerSchemaMetadata;
}): HandlerSchemaRenderContext {
  const jsonSchema = getJsonSchema(schema);
  const path: HandlerSchemaPath = label === 'Request' ? 'input' : 'output';
  const protobufSchema = getHandlerProtobufSchema({
    path,
    contentType,
    metadata,
  });
  const jsonSchemaTypes = Array.isArray(jsonSchema?.type)
    ? jsonSchema.type
    : undefined;
  const hasJsonObjectSchema = Boolean(
    jsonSchema &&
      (jsonSchema.type === 'object' ||
        jsonSchema.anyOf ||
        jsonSchemaTypes?.includes('object')),
  );
  const defaultTriggerLabel =
    getContentTypeDisplayName(contentType).toUpperCase();
  const displayName =
    jsonSchema?.title ??
    (protobufSchema
      ? getProtobufMessageDisplayName(protobufSchema.messageType)
      : undefined) ??
    (typeof jsonSchema?.type === 'string' ? jsonSchema.type : undefined);

  return {
    contentType,
    defaultTriggerLabel,
    displayName,
    hasJsonObjectSchema,
    jsonSchema,
    label,
    protobufSchema,
  };
}

/**
 * Decides which rendering kind the handler input/output should use.
 *
 * Cases covered:
 * - `text`: there is a non-object JSON schema like `{ type: 'string' }`, so a
 *   short inline label is enough.
 * - `hidden`: this is a request with `contentType === 'none'`, so nothing
 *   should be rendered.
 * - `protobuf-popover`: protobuf metadata is available, so we should show the
 *   protobuf source viewer in a popover.
 * - `json-schema-popover`: an object or `anyOf` JSON schema is available, so
 *   we should show the JSON schema viewer in a popover.
 * - `content-type-popover`: fallback when we do not have a richer schema, but
 *   still want a popover that shows the content type.
 *
 * @example
 * getHandlerSchemaKind({
 *   contentType: 'application/json',
 *   defaultTriggerLabel: 'JSON',
 *   hasJsonObjectSchema: false,
 *   jsonSchema: { type: 'string' },
 *   label: 'Response',
 *   protobufSchema: null,
 * })
 * // => 'text'
 *
 * @example
 * getHandlerSchemaKind({
 *   contentType: 'application/protobuf',
 *   defaultTriggerLabel: 'PROTOBUF',
 *   hasJsonObjectSchema: false,
 *   label: 'Request',
 *   protobufSchema: {
 *     kind: 'protobuf',
 *     contentType: 'application/protobuf',
 *     messageType: 'examples.v1.GreetRequest',
 *     source: { kind: 'url', url: 'https://example.com/schema.bin' },
 *   },
 * })
 * // => 'protobuf-popover'
 */
function getHandlerSchemaKind(
  context: HandlerSchemaRenderContext,
): HandlerSchemaKind {
  if (
    !context.protobufSchema &&
    !context.hasJsonObjectSchema &&
    context.jsonSchema
  ) {
    return 'text';
  }

  if (
    !context.protobufSchema &&
    !context.jsonSchema &&
    context.contentType === 'none'
  ) {
    return 'hidden';
  }

  if (context.protobufSchema) {
    return 'protobuf-popover';
  }

  if (context.hasJsonObjectSchema && context.jsonSchema) {
    return 'json-schema-popover';
  }

  return 'content-type-popover';
}

/**
 * Builds the final UI model returned by `getHandlerSchema()`.
 *
 * @example
 * buildHandlerSchema({
 *   contentType: 'application/json',
 *   defaultTriggerLabel: 'JSON',
 *   hasJsonObjectSchema: true,
 *   jsonSchema: { title: 'User', type: 'object' },
 *   label: 'Response',
 *   protobufSchema: null,
 * })
 * // => { kind: 'json-schema-popover', triggerLabel: 'User', title: 'User', jsonSchema: { ... } }
 */
function buildHandlerSchema(
  context: HandlerSchemaRenderContext,
): HandlerSchema {
  switch (getHandlerSchemaKind(context)) {
    case 'text':
      return {
        kind: 'text',
        text:
          typeof context.jsonSchema?.type === 'string'
            ? context.jsonSchema.type
            : getContentTypeDisplayName(context.contentType),
      };
    case 'hidden':
      return context.label === 'Request'
        ? {
            kind: 'hidden',
          }
        : {
            kind: 'text',
            text: 'void',
          };
    case 'protobuf-popover':
      return {
        kind: 'protobuf-popover',
        triggerLabel: context.displayName ?? context.defaultTriggerLabel,
        title: context.displayName ?? context.label,
        protobufSchema: context.protobufSchema as HandlerProtobufSchema,
      };
    case 'json-schema-popover':
      return {
        kind: 'json-schema-popover',
        triggerLabel: context.displayName ?? context.defaultTriggerLabel,
        title: context.displayName ?? context.label,
        jsonSchema: context.jsonSchema as JsonSchemaLike,
      };
    case 'content-type-popover':
      return {
        kind: 'content-type-popover',
        triggerLabel: context.defaultTriggerLabel,
        title: context.label,
        contentType: context.contentType,
      };
  }
}

/**
 * Returns the complete render model for handler input/output UI.
 *
 * @example
 * getHandlerSchema({
 *   schema: { title: 'User', type: 'object' },
 *   contentType: 'application/json',
 *   label: 'Response',
 * })
 * // => { kind: 'json-schema-popover', triggerLabel: 'User', title: 'User', jsonSchema: { ... } }
 *
 * @example
 * getHandlerSchema({
 *   contentType: 'none',
 *   label: 'Request',
 * })
 * // => { kind: 'hidden' }
 */
export function getHandlerSchema({
  schema,
  contentType,
  label,
  metadata,
}: {
  schema?: unknown;
  contentType: string;
  label: HandlerInputOutputLabel;
  metadata?: HandlerSchemaMetadata;
}): HandlerSchema {
  return buildHandlerSchema(
    getHandlerSchemaRenderContext({
      schema,
      contentType,
      label,
      metadata,
    }),
  );
}
