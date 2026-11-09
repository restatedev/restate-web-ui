import type { JsonSchema, JsonSchemaObject } from './types.js';

const MAX_REF_HOPS = 64;

export function isObject(value: unknown): value is JsonSchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodePointerSegment(segment: string) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  return decoded.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function resolvePointer(root: unknown, ref: string): unknown {
  if (!ref.startsWith('#')) {
    return undefined;
  }
  const pointer = ref.slice(1);
  if (pointer === '') {
    return root;
  }
  if (!pointer.startsWith('/')) {
    return undefined;
  }
  let current: unknown = root;
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = decodePointerSegment(rawSegment);
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
    } else if (isObject(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        return undefined;
      }
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function refName(ref: string) {
  const segments = ref.split('/');
  const last = segments.at(-1);
  return last ? decodePointerSegment(last) : ref;
}

export interface ResolvedRef<T> {
  value: T | undefined;
  ref?: string;
  chain: string[];
  error?: string;
}

export function resolveRef<T = unknown>(
  root: unknown,
  value: unknown,
): ResolvedRef<T> {
  let current = value;
  const chain: string[] = [];
  for (let hops = 0; hops < MAX_REF_HOPS; hops++) {
    if (!isObject(current) || typeof current['$ref'] !== 'string') {
      return { value: current as T, ref: chain.at(-1), chain };
    }
    const ref = current['$ref'];
    if (chain.includes(ref)) {
      return {
        value: undefined,
        ref: chain.at(-1),
        chain,
        error: `Circular $ref ${ref}`,
      };
    }
    chain.push(ref);
    const target = resolvePointer(root, ref);
    if (target === undefined) {
      return {
        value: undefined,
        ref,
        chain,
        error: ref.startsWith('#')
          ? `Cannot resolve ${ref}`
          : `External reference ${ref} is not supported`,
      };
    }
    current = target;
  }
  return {
    value: undefined,
    ref: chain.at(-1),
    chain,
    error: 'Too many $ref hops',
  };
}

export function resolveSchema(
  root: unknown,
  schema: JsonSchema | undefined,
): {
  schema: JsonSchema | undefined;
  ref?: string;
  refs: string[];
  error?: string;
} {
  if (
    schema === undefined ||
    typeof schema === 'boolean' ||
    typeof schema['$ref'] !== 'string'
  ) {
    return { schema, refs: [] };
  }
  const { $ref: _ref, ...siblings } = schema;
  const resolved = resolveRef<JsonSchema>(root, schema);
  if (resolved.error || resolved.value === undefined) {
    return {
      schema: undefined,
      ref: resolved.ref,
      refs: resolved.chain,
      error: resolved.error,
    };
  }
  if (
    Object.keys(siblings).length === 0 ||
    typeof resolved.value === 'boolean'
  ) {
    return { schema: resolved.value, ref: resolved.ref, refs: resolved.chain };
  }
  return {
    schema: { ...resolved.value, ...siblings },
    ref: resolved.ref,
    refs: resolved.chain,
  };
}

export function schemaTypes(schema: JsonSchemaObject): string[] {
  const type = schema['type'];
  if (typeof type === 'string') {
    return [type];
  }
  if (Array.isArray(type)) {
    return type.filter((entry): entry is string => typeof entry === 'string');
  }
  if (
    isObject(schema['properties']) ||
    isObject(schema['patternProperties']) ||
    isObject(schema['additionalProperties'])
  ) {
    return ['object'];
  }
  if (schema['items'] !== undefined || Array.isArray(schema['prefixItems'])) {
    return ['array'];
  }
  return [];
}

export function mergeAllOf(
  schema: JsonSchemaObject,
  root: unknown,
  seen: readonly string[] = [],
): { schema: JsonSchemaObject; refs: string[] } {
  const parts = Array.isArray(schema['allOf']) ? schema['allOf'] : [];
  const { allOf: _allOf, ...rest } = schema;
  let merged: JsonSchemaObject = { ...rest };
  const refs: string[] = [];
  for (const part of parts) {
    const resolved = resolveSchema(root, part as JsonSchema);
    refs.push(...resolved.refs);
    if (
      !isObject(resolved.schema) ||
      resolved.refs.some((ref) => seen.includes(ref))
    ) {
      continue;
    }
    const flat = Array.isArray(resolved.schema['allOf'])
      ? mergeAllOf(resolved.schema, root, [...seen, ...resolved.refs])
      : { schema: resolved.schema, refs: [] };
    refs.push(...flat.refs);
    const required = new Set([
      ...(Array.isArray(merged['required']) ? merged['required'] : []),
      ...(Array.isArray(flat.schema['required'])
        ? flat.schema['required']
        : []),
    ]);
    merged = {
      ...flat.schema,
      ...merged,
      properties: {
        ...(isObject(flat.schema['properties'])
          ? flat.schema['properties']
          : {}),
        ...(isObject(merged['properties']) ? merged['properties'] : {}),
      },
      ...(required.size > 0 && { required: Array.from(required) }),
    };
  }
  if (
    isObject(merged['properties']) &&
    Object.keys(merged['properties']).length === 0
  ) {
    delete merged['properties'];
  }
  return { schema: merged, refs };
}

const COMPONENT_REF = /^#\/components\/([^/]+)\/([^/]+)/;

export function bundleSchema(
  schema: unknown,
  root: unknown,
): JsonSchemaObject | undefined {
  if (!isObject(schema)) {
    return undefined;
  }
  const components: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();
  const queue: unknown[] = [schema];
  while (queue.length > 0) {
    const value = queue.pop();
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    if (!isObject(value)) {
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== '$ref' || typeof child !== 'string') {
        queue.push(child);
        continue;
      }
      const [, section, name] = child.match(COMPONENT_REF) ?? [];
      if (!section || !name || seen.has(`${section}/${name}`)) {
        continue;
      }
      seen.add(`${section}/${name}`);
      const target = resolvePointer(root, `#/components/${section}/${name}`);
      if (target === undefined) {
        continue;
      }
      const sectionName = decodePointerSegment(section);
      components[sectionName] = {
        ...components[sectionName],
        [decodePointerSegment(name)]: target,
      };
      queue.push(target);
    }
  }
  return Object.keys(components).length > 0
    ? { ...schema, components }
    : { ...schema };
}
