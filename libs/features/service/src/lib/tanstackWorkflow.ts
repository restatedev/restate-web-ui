export const INTEGRATION_METADATA_KEY = 'restate.dev/integration';
export const TANSTACK_WORKFLOW_INTEGRATION = 'tanstack-workflow';
export const TANSTACK_WORKFLOW_RUN_HANDLER = 'run';

interface ServiceWithMetadata {
  metadata?: Record<string, string> | null;
}

export function isTanstackWorkflow(service?: ServiceWithMetadata | null) {
  return (
    service?.metadata?.[INTEGRATION_METADATA_KEY] ===
    TANSTACK_WORKFLOW_INTEGRATION
  );
}

export function getListedHandlers<T extends { name: string }>(
  service: ServiceWithMetadata | null | undefined,
  handlers: T[],
): T[] {
  return isTanstackWorkflow(service)
    ? handlers.filter(({ name }) => name !== TANSTACK_WORKFLOW_RUN_HANDLER)
    : handlers;
}

export function getWorkflowRunHandler<T extends { name: string }>(
  handlers: T[] = [],
) {
  return handlers.find(({ name }) => name === TANSTACK_WORKFLOW_RUN_HANDLER);
}

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, unknown>;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  anyOf?: unknown[];
  oneOf?: unknown[];
  allOf?: unknown[];
}

const MAX_SKELETON_DEPTH = 8;

export function jsonSkeleton(schema: unknown, depth = 0): unknown {
  if (!schema || typeof schema !== 'object' || depth > MAX_SKELETON_DEPTH) {
    return null;
  }
  const node = schema as JsonSchema;
  if (node.default !== undefined) return node.default;
  if (node.const !== undefined) return node.const;
  if (node.enum && node.enum.length > 0) return node.enum[0];
  const variant = node.oneOf?.[0] ?? node.anyOf?.[0];
  if (variant !== undefined) return jsonSkeleton(variant, depth + 1);
  if (node.allOf && node.allOf.length > 0) {
    return Object.assign(
      {},
      ...node.allOf.map((part) => {
        const value = jsonSkeleton(part, depth + 1);
        return value && typeof value === 'object' && !Array.isArray(value)
          ? value
          : {};
      }),
    );
  }
  const type = Array.isArray(node.type)
    ? node.type.find((candidate) => candidate !== 'null')
    : (node.type ?? (node.properties ? 'object' : undefined));
  switch (type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(node.properties ?? {}).map(([key, value]) => [
          key,
          jsonSkeleton(value, depth + 1),
        ]),
      );
    case 'array':
      return [];
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

export function workflowPayloadSkeleton(inputSchema?: unknown) {
  return JSON.stringify(inputSchema ? jsonSkeleton(inputSchema) : {}, null, 2);
}
