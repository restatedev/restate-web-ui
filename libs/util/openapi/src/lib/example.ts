import { isObject, resolveSchema } from './refs.js';
import type { JsonSchema, JsonSchemaObject } from './types.js';

export type ExampleMode = 'request' | 'response';

export interface ExampleOptions {
  root?: unknown;
  mode?: ExampleMode;
  maxDepth?: number;
}

const FORMAT_EXAMPLES: Record<string, string> = {
  'date-time': '2026-01-01T00:00:00Z',
  date: '2026-01-01',
  time: '00:00:00Z',
  duration: 'PT1H',
  email: 'user@example.com',
  'idn-email': 'user@example.com',
  hostname: 'example.com',
  'idn-hostname': 'example.com',
  ipv4: '192.0.2.1',
  ipv6: '2001:db8::1',
  uri: 'https://example.com',
  'uri-reference': '/path',
  iri: 'https://example.com',
  url: 'https://example.com',
  uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  byte: 'U3RyaW5n',
  binary: '',
  password: 'password',
  regex: '.*',
  'json-pointer': '/',
};

function typesOf(schema: JsonSchemaObject): string[] {
  const type = schema['type'];
  if (typeof type === 'string') {
    return [type];
  }
  if (Array.isArray(type)) {
    return type.filter((entry): entry is string => typeof entry === 'string');
  }
  if (
    isObject(schema['properties']) ||
    isObject(schema['additionalProperties'])
  ) {
    return ['object'];
  }
  if (schema['items'] !== undefined || Array.isArray(schema['prefixItems'])) {
    return ['array'];
  }
  return [];
}

function mergeAllOf(schema: JsonSchemaObject, root: unknown): JsonSchemaObject {
  const parts = Array.isArray(schema['allOf']) ? schema['allOf'] : [];
  const { allOf: _allOf, ...rest } = schema;
  let merged: JsonSchemaObject = { ...rest };
  for (const part of parts) {
    const resolved = resolveSchema(root, part as JsonSchema).schema;
    if (!isObject(resolved)) {
      continue;
    }
    const flat = mergeAllOf(resolved, root);
    merged = {
      ...flat,
      ...merged,
      properties: {
        ...(isObject(flat['properties']) ? flat['properties'] : {}),
        ...(isObject(merged['properties']) ? merged['properties'] : {}),
      },
      required: [
        ...(Array.isArray(flat['required']) ? flat['required'] : []),
        ...(Array.isArray(merged['required']) ? merged['required'] : []),
      ],
    };
  }
  return merged;
}

function firstBranch(schema: JsonSchemaObject, root: unknown) {
  for (const keyword of ['oneOf', 'anyOf']) {
    const branches = schema[keyword];
    if (!Array.isArray(branches)) {
      continue;
    }
    const resolved = branches.map(
      (branch) => resolveSchema(root, branch as JsonSchema).schema,
    );
    return (
      resolved.find(
        (branch) =>
          isObject(branch) &&
          !(branch['type'] === 'null' || branch['const'] === null),
      ) ?? resolved[0]
    );
  }
  return undefined;
}

function bound(value: unknown) {
  return typeof value === 'number' && Math.abs(value) < Number.MAX_SAFE_INTEGER
    ? value
    : undefined;
}

function numberExample(schema: JsonSchemaObject, integer: boolean) {
  const step = integer ? 1 : 0.1;
  const exclusiveMinimum = bound(schema['exclusiveMinimum']);
  const exclusiveMaximum = bound(schema['exclusiveMaximum']);
  const minimum =
    bound(schema['minimum']) ??
    (exclusiveMinimum !== undefined ? exclusiveMinimum + step : undefined);
  const maximum =
    bound(schema['maximum']) ??
    (exclusiveMaximum !== undefined ? exclusiveMaximum - step : undefined);
  let value = 0;
  if (minimum !== undefined && value < minimum) {
    value = minimum;
  }
  if (maximum !== undefined && value > maximum) {
    value = maximum;
  }
  const multipleOf = schema['multipleOf'];
  if (typeof multipleOf === 'number' && multipleOf > 0) {
    value = Math.ceil(value / multipleOf) * multipleOf;
  }
  return integer ? Math.ceil(value) : value;
}

const CLASS_ESCAPES: Record<string, string> = {
  d: '0',
  w: 'a',
  s: ' ',
};

function sampleQuantifier(pattern: string, index: number) {
  const char = pattern[index];
  if (char === '*' || char === '?') {
    return { count: 0, next: index + 1 };
  }
  if (char === '+') {
    return { count: 1, next: index + 1 };
  }
  if (char === '{') {
    const end = pattern.indexOf('}', index);
    const match = pattern.slice(index + 1, end).match(/^(\d+)(,\d*)?$/);
    if (end !== -1 && match) {
      return { count: Number(match[1]), next: end + 1 };
    }
  }
  return { count: 1, next: index };
}

function sampleSequence(
  pattern: string,
  start: number,
): { value: string; next: number } | undefined {
  let value = '';
  let index = start;
  while (index < pattern.length) {
    const char = pattern[index] as string;
    let atom: string | undefined;
    if (char === '^' || char === '$') {
      index++;
      continue;
    }
    if (char === ')' || char === '|') {
      return { value, next: index };
    }
    if (char === '(') {
      if (pattern[index + 1] === '?') {
        if (pattern[index + 2] !== ':') {
          return undefined;
        }
        index += 2;
      }
      const group = sampleSequence(pattern, index + 1);
      if (!group) {
        return undefined;
      }
      let depth = 0;
      let cursor = group.next;
      while (cursor < pattern.length) {
        const current = pattern[cursor];
        if (current === '\\') {
          cursor += 2;
          continue;
        }
        if (current === '(') depth++;
        if (current === ')') {
          if (depth === 0) break;
          depth--;
        }
        cursor++;
      }
      atom = group.value;
      index = cursor + 1;
    } else if (char === '[') {
      const end = pattern.indexOf(']', index + 2);
      const body = pattern.slice(index + 1, end);
      if (end === -1 || body.startsWith('^')) {
        return undefined;
      }
      atom =
        body[0] === '\\' ? (CLASS_ESCAPES[body[1] ?? ''] ?? body[1]) : body[0];
      index = end + 1;
    } else if (char === '\\') {
      const escaped = pattern[index + 1] ?? '';
      if (/[1-9bBk]/.test(escaped)) {
        return undefined;
      }
      atom = CLASS_ESCAPES[escaped] ?? escaped;
      index += 2;
    } else if (char === '.') {
      atom = 'a';
      index++;
    } else {
      atom = char;
      index++;
    }
    const { count, next } = sampleQuantifier(pattern, index);
    value += (atom ?? '').repeat(count);
    index = next;
  }
  return { value, next: index };
}

export function sampleFromPattern(pattern: string) {
  try {
    const regex = new RegExp(pattern, 'u');
    const sampled = sampleSequence(pattern, 0)?.value;
    return sampled !== undefined && regex.test(sampled) ? sampled : undefined;
  } catch {
    return undefined;
  }
}

function matchesPattern(value: string, pattern: unknown) {
  if (typeof pattern !== 'string') {
    return true;
  }
  try {
    return new RegExp(pattern, 'u').test(value);
  } catch {
    return true;
  }
}

function stringExample(schema: JsonSchemaObject) {
  const format = typeof schema['format'] === 'string' ? schema['format'] : '';
  const pattern = schema['pattern'];
  const formatExample = FORMAT_EXAMPLES[format];
  if (formatExample !== undefined && matchesPattern(formatExample, pattern)) {
    return formatExample;
  }
  if (typeof pattern === 'string') {
    const sampled = sampleFromPattern(pattern);
    if (sampled !== undefined) {
      return sampled;
    }
  }
  let value = 'string';
  const minLength = schema['minLength'];
  const maxLength = schema['maxLength'];
  if (typeof minLength === 'number' && value.length < minLength) {
    value = value.padEnd(minLength, 'x');
  }
  if (typeof maxLength === 'number' && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value;
}

function sample(
  input: JsonSchema | undefined,
  options: Required<Pick<ExampleOptions, 'mode' | 'maxDepth'>> & {
    root: unknown;
  },
  depth: number,
  refs: readonly string[],
): unknown {
  if (typeof input !== 'object') {
    return undefined;
  }
  const { schema: resolved, refs: chain } = resolveSchema(options.root, input);
  if (!isObject(resolved) || chain.some((ref) => refs.includes(ref))) {
    return undefined;
  }
  const nextRefs = [...refs, ...chain];
  const schema = Array.isArray(resolved['allOf'])
    ? mergeAllOf(resolved, options.root)
    : resolved;

  const examples = schema['examples'];
  if (Array.isArray(examples) && examples.length > 0) {
    return examples[0];
  }
  if ('example' in schema) {
    return schema['example'];
  }
  if ('const' in schema) {
    return schema['const'];
  }
  if ('default' in schema) {
    return schema['default'];
  }
  if (Array.isArray(schema['enum']) && schema['enum'].length > 0) {
    return schema['enum'].find((value) => value !== null) ?? schema['enum'][0];
  }
  const branch = firstBranch(schema, options.root);
  if (branch !== undefined) {
    const { oneOf: _oneOf, anyOf: _anyOf, ...siblings } = schema;
    const combined =
      isObject(branch) && typesOf(siblings).length > 0
        ? { ...siblings, ...branch }
        : branch;
    return sample(combined, options, depth, nextRefs);
  }

  const type =
    typesOf(schema).find((entry) => entry !== 'null') ??
    (typesOf(schema).includes('null') ? 'null' : undefined);

  switch (type) {
    case 'object': {
      if (depth >= options.maxDepth) {
        return {};
      }
      const result: Record<string, unknown> = {};
      const properties = isObject(schema['properties'])
        ? schema['properties']
        : {};
      for (const [name, property] of Object.entries(properties)) {
        const { schema: resolvedProperty } = resolveSchema(
          options.root,
          property as JsonSchema,
        );
        if (
          isObject(resolvedProperty) &&
          ((options.mode === 'request' &&
            resolvedProperty['readOnly'] === true) ||
            (options.mode === 'response' &&
              resolvedProperty['writeOnly'] === true))
        ) {
          continue;
        }
        const value = sample(
          property as JsonSchema,
          options,
          depth + 1,
          nextRefs,
        );
        if (value !== undefined) {
          result[name] = value;
        } else if (
          property === true ||
          (isObject(resolvedProperty) &&
            Object.keys(resolvedProperty).length === 0)
        ) {
          result[name] = {};
        }
      }
      const additional = schema['additionalProperties'];
      if (
        Object.keys(properties).length === 0 &&
        isObject(additional) &&
        Object.keys(additional).length > 0
      ) {
        const value = sample(additional, options, depth + 1, nextRefs);
        if (value !== undefined) {
          result['key'] = value;
        }
      }
      return result;
    }
    case 'array': {
      if (depth >= options.maxDepth) {
        return [];
      }
      if (Array.isArray(schema['prefixItems'])) {
        return schema['prefixItems'].map((item) =>
          sample(item as JsonSchema, options, depth + 1, nextRefs),
        );
      }
      const item = sample(
        schema['items'] as JsonSchema | undefined,
        options,
        depth + 1,
        nextRefs,
      );
      return item === undefined ? [] : [item];
    }
    case 'string':
      return stringExample(schema);
    case 'integer':
      return numberExample(schema, true);
    case 'number':
      return numberExample(schema, false);
    case 'boolean':
      return true;
    case 'null':
      return null;
    default:
      return undefined;
  }
}

export function generateExample(
  schema: JsonSchema | undefined,
  { root, mode = 'request', maxDepth = 8 }: ExampleOptions = {},
) {
  return sample(schema, { root, mode, maxDepth }, 0, []);
}

export function stringifyExample(value: unknown) {
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return JSON.stringify(value, null, 2);
}
