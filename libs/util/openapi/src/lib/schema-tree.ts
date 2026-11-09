import {
  isObject,
  mergeAllOf,
  refName,
  resolveSchema,
  schemaTypes,
} from './refs.js';
import type { JsonSchema, JsonSchemaObject } from './types.js';

export type SchemaViewMode = 'read' | 'write' | 'standalone';

export interface SchemaRule {
  keyword: string;
  value: unknown;
}

export interface SchemaVariant {
  label: string;
  node: SchemaNode;
}

export interface SchemaNode {
  id: string;
  name?: string;
  kind: 'root' | 'property' | 'pattern' | 'additional' | 'item' | 'variant';
  required: boolean;
  type: string;
  title?: string;
  description?: string;
  deprecated: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  nullable: boolean;
  constraints: string[];
  constValue?: { value: unknown };
  allowedValues?: unknown[];
  defaultValue?: { value: unknown };
  examples?: unknown[];
  pattern?: string;
  children: SchemaNode[];
  variants?: { keyword: 'oneOf' | 'anyOf'; options: SchemaVariant[] };
  recursiveRef?: string;
  error?: string;
  rules: SchemaRule[];
}

export interface SchemaTreeOptions {
  root?: unknown;
  mode?: SchemaViewMode;
  maxDepth?: number;
}

const NUMERIC_FORMATS_WITH_IMPLIED_BOUNDS = new Set([
  'int32',
  'int64',
  'uint32',
  'uint64',
  'float',
  'double',
]);
const RAW_RULE_KEYWORDS = [
  'not',
  'if',
  'then',
  'else',
  'dependentRequired',
  'dependentSchemas',
  'dependencies',
  'unevaluatedProperties',
  'unevaluatedItems',
  'propertyNames',
  'contains',
  'minContains',
  'maxContains',
  'contentEncoding',
  'contentMediaType',
];

interface Context {
  root: unknown;
  mode: SchemaViewMode;
  maxDepth: number;
}

function isNullSchema(schema: unknown) {
  return (
    isObject(schema) &&
    (schema['type'] === 'null' ||
      schema['const'] === null ||
      (Array.isArray(schema['enum']) &&
        schema['enum'].length === 1 &&
        schema['enum'][0] === null))
  );
}

function isSafeIntegerBound(value: unknown) {
  return (
    typeof value === 'number' && Math.abs(value) >= Number.MAX_SAFE_INTEGER
  );
}

function constraintsOf(schema: JsonSchemaObject, types: string[]) {
  const constraints: string[] = [];
  const isNumeric = types.includes('number') || types.includes('integer');
  const format = typeof schema['format'] === 'string' ? schema['format'] : '';
  const skipBounds = NUMERIC_FORMATS_WITH_IMPLIED_BOUNDS.has(format);
  const numeric = (keyword: string, symbol: string) => {
    const value = schema[keyword];
    if (
      typeof value === 'number' &&
      !isSafeIntegerBound(value) &&
      !(skipBounds && isNumeric)
    ) {
      constraints.push(`${symbol} ${value}`);
    }
  };
  numeric('minimum', '>=');
  numeric('exclusiveMinimum', '>');
  numeric('maximum', '<=');
  numeric('exclusiveMaximum', '<');
  if (typeof schema['multipleOf'] === 'number') {
    constraints.push(`multiple of ${schema['multipleOf']}`);
  }
  const counted = (keyword: string, symbol: string, unit: string) => {
    const value = schema[keyword];
    if (typeof value === 'number') {
      constraints.push(`${symbol} ${value} ${unit}`);
    }
  };
  counted('minLength', '>=', 'characters');
  counted('maxLength', '<=', 'characters');
  counted('minItems', '>=', 'items');
  counted('maxItems', '<=', 'items');
  counted('minProperties', '>=', 'properties');
  counted('maxProperties', '<=', 'properties');
  if (schema['uniqueItems'] === true) {
    constraints.push('unique items');
  }
  return constraints;
}

function typeLabel(
  schema: JsonSchemaObject,
  types: string[],
  ref: string | undefined,
  itemLabel: string | undefined,
  dictionaryLabel: string | undefined,
) {
  const nonNull = types.filter((type) => type !== 'null');
  const format = typeof schema['format'] === 'string' ? schema['format'] : '';
  const named =
    (typeof schema['title'] === 'string' && schema['title']) ||
    (ref ? refName(ref) : undefined);
  if (nonNull.length === 0) {
    if (format) {
      return `<${format}>`;
    }
    return types.includes('null') ? 'null' : 'any';
  }
  return nonNull
    .map((type) => {
      if (type === 'array') {
        return itemLabel ? `array[${itemLabel}]` : 'array';
      }
      if (type === 'object') {
        if (dictionaryLabel) {
          return `dictionary[string, ${dictionaryLabel}]`;
        }
        return named || 'object';
      }
      return format ? `${type}<${format}>` : type;
    })
    .join(' or ');
}

function variantLabel(
  option: JsonSchema | undefined,
  index: number,
  ref: string | undefined,
  root: unknown,
) {
  if (!isObject(option)) {
    return option === true ? 'any' : `Option ${index + 1}`;
  }
  if (typeof option['title'] === 'string' && option['title']) {
    return option['title'];
  }
  if (ref) {
    return refName(ref);
  }
  if (isObject(option['properties'])) {
    for (const property of Object.values(option['properties'])) {
      const { schema } = resolveSchema(root, property as JsonSchema);
      if (isObject(schema) && typeof schema['const'] === 'string') {
        return schema['const'];
      }
    }
  }
  const types = schemaTypes(option);
  if (types.length > 0) {
    return typeLabel(option, types, undefined, undefined, undefined);
  }
  return `Option ${index + 1}`;
}

function isHidden(schema: JsonSchema | undefined, mode: SchemaViewMode) {
  if (!isObject(schema)) {
    return false;
  }
  if (schema['readOnly'] === true && schema['writeOnly'] === true) {
    return false;
  }
  return (
    (mode === 'write' && schema['readOnly'] === true) ||
    (mode === 'read' && schema['writeOnly'] === true)
  );
}

function build(
  input: JsonSchema | undefined,
  context: Context,
  meta: {
    id: string;
    name?: string;
    kind: SchemaNode['kind'];
    required: boolean;
    depth: number;
    refs: readonly string[];
  },
): SchemaNode {
  const base: SchemaNode = {
    id: meta.id,
    name: meta.name,
    kind: meta.kind,
    required: meta.required,
    type: 'any',
    deprecated: false,
    readOnly: false,
    writeOnly: false,
    nullable: false,
    constraints: [],
    children: [],
    rules: [],
  };
  if (input === undefined || input === true) {
    return base;
  }
  if (input === false) {
    return { ...base, type: 'never' };
  }
  const resolved = resolveSchema(context.root, input);
  if (resolved.error || !isObject(resolved.schema)) {
    return {
      ...base,
      type: resolved.schema === false ? 'never' : (resolved.ref ?? base.type),
      error: resolved.error,
    };
  }
  const recursive = resolved.refs.find((ref) => meta.refs.includes(ref));
  if (recursive) {
    return {
      ...base,
      type:
        typeof resolved.schema['title'] === 'string'
          ? resolved.schema['title']
          : refName(recursive),
      recursiveRef: recursive,
      description:
        typeof resolved.schema['description'] === 'string'
          ? resolved.schema['description']
          : undefined,
    };
  }
  const refs = [...meta.refs, ...resolved.refs];
  let schema = resolved.schema;
  if (Array.isArray(schema['allOf'])) {
    const merged = mergeAllOf(schema, context.root);
    const recursiveAllOf = merged.refs.find((ref) => refs.includes(ref));
    if (recursiveAllOf) {
      return {
        ...base,
        type:
          typeof schema['title'] === 'string'
            ? schema['title']
            : refName(recursiveAllOf),
        recursiveRef: recursiveAllOf,
        description:
          typeof schema['description'] === 'string'
            ? schema['description']
            : undefined,
      };
    }
    refs.push(...merged.refs);
    schema = merged.schema;
  }

  let nullable = false;
  let variantRef = resolved.ref;
  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const options = schema[keyword];
    if (!Array.isArray(options)) {
      continue;
    }
    const nonNull = options.filter((option) => !isNullSchema(option));
    if (nonNull.length === options.length - 1 && nonNull.length >= 1) {
      nullable = true;
      if (nonNull.length === 1) {
        const { [keyword]: _options, ...siblings } = schema;
        const single = resolveSchema(context.root, nonNull[0] as JsonSchema);
        if (isObject(single.schema)) {
          const recursiveSingle = single.refs.find((ref) => refs.includes(ref));
          if (recursiveSingle) {
            return {
              ...base,
              type: refName(recursiveSingle),
              recursiveRef: recursiveSingle,
              nullable: true,
            };
          }
          refs.push(...single.refs);
          if (single.ref) {
            variantRef = single.ref;
          }
          schema = { ...single.schema, ...siblings };
          if (Array.isArray(schema['allOf'])) {
            const merged = mergeAllOf(schema, context.root);
            const recursiveAllOf = merged.refs.find((ref) =>
              refs.includes(ref),
            );
            if (recursiveAllOf) {
              return {
                ...base,
                type: refName(recursiveAllOf),
                recursiveRef: recursiveAllOf,
                nullable: true,
              };
            }
            refs.push(...merged.refs);
            schema = merged.schema;
          }
        }
      } else {
        schema = { ...schema, [keyword]: nonNull };
      }
    }
  }

  const types = schemaTypes(schema);
  if (types.includes('null')) {
    nullable = true;
  }

  const node: SchemaNode = {
    ...base,
    title: typeof schema['title'] === 'string' ? schema['title'] : undefined,
    description:
      typeof schema['description'] === 'string'
        ? schema['description']
        : undefined,
    deprecated:
      schema['deprecated'] === true || schema['x-deprecated'] === true,
    readOnly: schema['readOnly'] === true,
    writeOnly: schema['writeOnly'] === true,
    nullable,
    constraints: constraintsOf(schema, types),
    rules: RAW_RULE_KEYWORDS.flatMap((keyword) =>
      keyword in schema ? [{ keyword, value: schema[keyword] }] : [],
    ),
  };
  if ('const' in schema) {
    node.constValue = { value: schema['const'] };
  }
  if (Array.isArray(schema['enum'])) {
    node.allowedValues = schema['enum'].filter((value) => value !== null);
    if (schema['enum'].includes(null)) {
      node.nullable = true;
    }
  }
  if ('default' in schema) {
    node.defaultValue = { value: schema['default'] };
  }
  const examples = Array.isArray(schema['examples'])
    ? schema['examples']
    : 'example' in schema
      ? [schema['example']]
      : undefined;
  if (examples && examples.length > 0) {
    node.examples = examples;
  }
  if (
    typeof schema['pattern'] === 'string' &&
    typeof schema['format'] !== 'string'
  ) {
    node.pattern = schema['pattern'];
  }

  const depth = meta.depth + 1;
  const canDescend = depth <= context.maxDepth;
  let itemLabel: string | undefined;
  let dictionaryLabel: string | undefined;

  if (canDescend && types.includes('array')) {
    if (Array.isArray(schema['prefixItems'])) {
      node.children = schema['prefixItems'].map((item, index) =>
        build(item as JsonSchema, context, {
          id: `${meta.id}/${index}`,
          name: `[${index}]`,
          kind: 'item',
          required: true,
          depth,
          refs,
        }),
      );
      itemLabel = node.children.map((child) => child.type).join(', ');
    } else if (
      schema['items'] !== undefined &&
      typeof schema['items'] !== 'boolean'
    ) {
      const item = build(schema['items'] as JsonSchema, context, {
        id: `${meta.id}/items`,
        kind: 'item',
        required: false,
        depth,
        refs,
      });
      itemLabel = item.type;
      if (item.children.length > 0 || item.variants) {
        node.children = item.children;
        node.variants = item.variants;
      } else {
        node.constraints = [
          ...node.constraints,
          ...item.constraints.map((constraint) => `items ${constraint}`),
        ];
        node.allowedValues ??= item.allowedValues;
        node.pattern ??= item.pattern;
      }
      if (item.recursiveRef) {
        node.recursiveRef = item.recursiveRef;
      }
    }
  }

  if (canDescend && (types.includes('object') || types.length === 0)) {
    const required = new Set(
      Array.isArray(schema['required'])
        ? schema['required'].filter(
            (key): key is string => typeof key === 'string',
          )
        : [],
    );
    const properties = isObject(schema['properties'])
      ? schema['properties']
      : {};
    for (const [name, property] of Object.entries(properties)) {
      const resolvedProperty = resolveSchema(
        context.root,
        property as JsonSchema,
      ).schema;
      if (isHidden(resolvedProperty, context.mode)) {
        continue;
      }
      node.children.push(
        build(property as JsonSchema, context, {
          id: `${meta.id}/properties/${name}`,
          name,
          kind: 'property',
          required: required.has(name),
          depth,
          refs,
        }),
      );
    }
    const patterns = isObject(schema['patternProperties'])
      ? schema['patternProperties']
      : {};
    for (const [pattern, property] of Object.entries(patterns)) {
      node.children.push(
        build(property as JsonSchema, context, {
          id: `${meta.id}/patternProperties/${pattern}`,
          name: pattern,
          kind: 'pattern',
          required: false,
          depth,
          refs,
        }),
      );
    }
    const additional = schema['additionalProperties'];
    if (additional !== undefined && additional !== false) {
      const child = build(additional as JsonSchema, context, {
        id: `${meta.id}/additionalProperties`,
        name: '[key: string]',
        kind: 'additional',
        required: false,
        depth,
        refs,
      });
      if (
        Object.keys(properties).length === 0 &&
        Object.keys(patterns).length === 0
      ) {
        dictionaryLabel = child.type;
        node.children = child.children;
        node.variants = child.variants;
      } else {
        node.children.push(child);
      }
    }
  }

  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const options = schema[keyword];
    if (!canDescend || !Array.isArray(options) || node.variants) {
      continue;
    }
    const { oneOf: _oneOf, anyOf: _anyOf, ...siblings } = schema;
    const inherit = Object.fromEntries(
      Object.entries(siblings).filter(([key]) =>
        ['type', 'properties', 'required', 'additionalProperties'].includes(
          key,
        ),
      ),
    );
    node.variants = {
      keyword,
      options: options.map((option, index) => {
        const resolvedOption = resolveSchema(
          context.root,
          option as JsonSchema,
        );
        const merged =
          isObject(resolvedOption.schema) && Object.keys(inherit).length > 0
            ? { ...inherit, ...resolvedOption.schema }
            : (option as JsonSchema);
        return {
          label: variantLabel(
            resolvedOption.schema,
            index,
            resolvedOption.ref,
            context.root,
          ),
          node: build(merged, context, {
            id: `${meta.id}/${keyword}/${index}`,
            kind: 'variant',
            required: false,
            depth,
            refs,
          }),
        };
      }),
    };
  }

  node.type =
    node.variants && types.length === 0
      ? (node.title ??
        node.variants.options.map(({ label }) => label).join(' or '))
      : typeLabel(schema, types, variantRef, itemLabel, dictionaryLabel);
  return node;
}

export function buildSchemaTree(
  schema: JsonSchema | undefined,
  { root, mode = 'standalone', maxDepth = 24 }: SchemaTreeOptions = {},
): SchemaNode {
  return build(
    schema,
    { root: root ?? schema, mode, maxDepth },
    {
      id: '#',
      kind: 'root',
      required: false,
      depth: 0,
      refs: [],
    },
  );
}

export function hasSchemaDetails(node: SchemaNode) {
  return (
    node.children.length > 0 ||
    Boolean(node.variants) ||
    node.constraints.length > 0 ||
    node.rules.length > 0 ||
    node.allowedValues !== undefined ||
    node.constValue !== undefined ||
    node.defaultValue !== undefined ||
    node.examples !== undefined ||
    node.pattern !== undefined ||
    Boolean(node.description)
  );
}
