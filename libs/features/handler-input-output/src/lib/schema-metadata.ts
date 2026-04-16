export type HandlerInputOutputLabel = 'Request' | 'Response';

interface JsonSchemaLike {
  title?: string;
  type?: string | string[];
  anyOf?: unknown;
}

export type HandlerInputOutputView =
  | {
      kind: 'hidden';
    }
  | {
      kind: 'text';
      text: string;
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

interface HandlerInputOutputViewContext {
  contentType: string;
  defaultTriggerLabel: string;
  displayName?: string;
  hasJsonObjectSchema: boolean;
  jsonSchema?: JsonSchemaLike;
  label: HandlerInputOutputLabel;
}

function getJsonSchema(schema?: unknown) {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  return schema as JsonSchemaLike;
}

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

function getHandlerInputOutputViewContext({
  jsonSchema,
  contentType,
  label,
}: {
  jsonSchema?: unknown;
  contentType: string;
  label: HandlerInputOutputLabel;
}): HandlerInputOutputViewContext {
  const parsedJsonSchema = getJsonSchema(jsonSchema);
  const jsonSchemaTypes = Array.isArray(parsedJsonSchema?.type)
    ? parsedJsonSchema.type
    : undefined;
  const hasJsonObjectSchema = Boolean(
    parsedJsonSchema &&
      (parsedJsonSchema.type === 'object' ||
        parsedJsonSchema.anyOf ||
        jsonSchemaTypes?.includes('object')),
  );
  const defaultTriggerLabel =
    getContentTypeDisplayName(contentType).toUpperCase();
  const displayName =
    parsedJsonSchema?.title ??
    (typeof parsedJsonSchema?.type === 'string'
      ? parsedJsonSchema.type
      : undefined);

  return {
    contentType,
    defaultTriggerLabel,
    displayName,
    hasJsonObjectSchema,
    jsonSchema: parsedJsonSchema,
    label,
  };
}

function buildHandlerInputOutputView(
  context: HandlerInputOutputViewContext,
): HandlerInputOutputView {
  if (!context.hasJsonObjectSchema && context.jsonSchema) {
    return {
      kind: 'text',
      text:
        typeof context.jsonSchema.type === 'string'
          ? context.jsonSchema.type
          : getContentTypeDisplayName(context.contentType),
    };
  }

  if (!context.jsonSchema && context.contentType === 'none') {
    return context.label === 'Request'
      ? {
          kind: 'hidden',
        }
      : {
          kind: 'text',
          text: 'void',
        };
  }

  if (context.hasJsonObjectSchema && context.jsonSchema) {
    return {
      kind: 'json-schema-popover',
      triggerLabel: context.displayName ?? context.defaultTriggerLabel,
      title: context.displayName ?? context.label,
      jsonSchema: context.jsonSchema,
    };
  }

  return {
    kind: 'content-type-popover',
    triggerLabel: context.defaultTriggerLabel,
    title: context.label,
    contentType: context.contentType,
  };
}

export function getHandlerInputOutputView({
  jsonSchema,
  contentType,
  label,
}: {
  jsonSchema?: unknown;
  contentType: string;
  label: HandlerInputOutputLabel;
}): HandlerInputOutputView {
  return buildHandlerInputOutputView(
    getHandlerInputOutputViewContext({
      jsonSchema,
      contentType,
      label,
    }),
  );
}
