import {
  isJsonContentType,
  isObject,
  mergeAllOf,
  resolveSchema,
  schemaTypes,
  type ContractHandler,
  type JsonSchema,
  type JsonSchemaObject,
} from '@restate/util-openapi';

const MAX_PROPERTIES = 4;
const MAX_DEPTH = 2;

function union(parts: string[]) {
  return Array.from(new Set(parts)).join(' | ');
}

function objectText(schema: JsonSchemaObject, root: unknown, depth: number) {
  const properties = isObject(schema['properties'])
    ? Object.entries(schema['properties'])
    : [];
  if (properties.length === 0) {
    return isObject(schema['additionalProperties'])
      ? `{ [key: string]: ${typeText(schema['additionalProperties'], root, depth + 1)} }`
      : 'object';
  }
  if (depth >= MAX_DEPTH) {
    return '{…}';
  }
  const required = new Set(
    Array.isArray(schema['required']) ? schema['required'] : [],
  );
  const entries = properties
    .slice(0, MAX_PROPERTIES)
    .map(
      ([name, property]) =>
        `${name}${required.has(name) ? '' : '?'}: ${typeText(property as JsonSchema, root, depth + 1)}`,
    );
  if (properties.length > MAX_PROPERTIES) {
    entries.push('…');
  }
  return `{ ${entries.join(', ')} }`;
}

function arrayText(schema: JsonSchemaObject, root: unknown, depth: number) {
  const items = schema['items'];
  if (items === undefined || typeof items === 'boolean' || !isObject(items)) {
    return 'array';
  }
  const inner = typeText(items, root, depth + 1);
  return inner.includes(' | ') ? `(${inner})[]` : `${inner}[]`;
}

export function typeText(
  schema: JsonSchema | undefined,
  root: unknown,
  depth = 0,
): string {
  if (schema === undefined || schema === true) {
    return 'any';
  }
  if (schema === false) {
    return 'never';
  }
  const resolved = resolveSchema(root, schema).schema;
  if (!isObject(resolved)) {
    return resolved === false ? 'never' : 'any';
  }
  const value = Array.isArray(resolved['allOf'])
    ? mergeAllOf(resolved, root).schema
    : resolved;
  if ('const' in value) {
    return JSON.stringify(value['const']);
  }
  if (Array.isArray(value['enum'])) {
    return union(value['enum'].map((entry) => JSON.stringify(entry)));
  }
  const variants = value['oneOf'] ?? value['anyOf'];
  if (Array.isArray(variants)) {
    return union(
      variants.map((variant) => typeText(variant as JsonSchema, root, depth)),
    );
  }
  const types = schemaTypes(value);
  if (types.length === 0) {
    return 'any';
  }
  return union(
    types.map((type) =>
      type === 'object'
        ? objectText(value, root, depth)
        : type === 'array'
          ? arrayText(value, root, depth)
          : type,
    ),
  );
}

export function handlerOutput(handler: ContractHandler) {
  return handler.modes.call?.responses.find(({ status }) =>
    status.startsWith('2'),
  );
}

export function bodyTypeText(
  body: { contentType?: string; schema?: JsonSchema } | undefined,
  root: unknown,
) {
  if (!body) {
    return undefined;
  }
  if (body.contentType && !isJsonContentType(body.contentType)) {
    return body.contentType;
  }
  return typeText(body.schema, root);
}
