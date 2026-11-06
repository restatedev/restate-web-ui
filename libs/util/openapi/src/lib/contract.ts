import { isObject, resolveRef } from './refs.js';
import {
  HANDLER_MODES,
  INVOCATION_TOOLS,
  type ContractBody,
  type ContractHandler,
  type ContractInvocationTool,
  type ContractOperation,
  type ContractParameter,
  type ContractResponse,
  type ContractSecurity,
  type HandlerMode,
  type HttpMethod,
  type InvocationToolKind,
  type JsonSchema,
  type OpenApiDocument,
  type ParameterLocation,
  type ParameterRole,
  type ServiceContract,
} from './types.js';

const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
];
const PARAMETER_LOCATIONS: readonly ParameterLocation[] = [
  'path',
  'query',
  'header',
  'cookie',
];

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function asSchema(value: unknown): JsonSchema | undefined {
  if (typeof value === 'boolean' || isObject(value)) {
    return value;
  }
  return undefined;
}

function stringRecord(value: unknown) {
  if (!isObject(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) =>
      typeof entry === 'string'
        ? [[key, entry]]
        : entry === undefined || entry === null
          ? []
          : [[key, JSON.stringify(entry)]],
    ),
  );
}

function restateExtensions(value: unknown) {
  return isObject(value) ? stringRecord(value['x-restate-extensions']) : {};
}

function firstExample(media: Record<string, unknown>) {
  if ('example' in media) {
    return media['example'];
  }
  const examples = media['examples'];
  if (isObject(examples)) {
    for (const example of Object.values(examples)) {
      if (isObject(example) && 'value' in example) {
        return example['value'];
      }
    }
  }
  return undefined;
}

function parameterRole(
  name: string,
  location: ParameterLocation,
): ParameterRole | undefined {
  const lower = name.toLowerCase();
  if (location === 'path') {
    if (name === 'key') return 'key';
    if (name === 'scope') return 'scope';
    if (name === 'invocationId') return 'invocationId';
    if (name === 'idempotencyKey') return 'idempotencyKey';
  }
  if (location === 'header') {
    if (lower === 'idempotency-key') return 'idempotencyKey';
    if (lower === 'x-restate-limit-key') return 'limitKey';
  }
  if (location === 'query' && name === 'delay') {
    return 'delay';
  }
  return undefined;
}

function parseParameter(
  document: OpenApiDocument,
  raw: unknown,
): ContractParameter | undefined {
  const { value } = resolveRef(document, raw);
  if (!isObject(value)) {
    return undefined;
  }
  const name = asString(value['name']);
  const location = asString(value['in']) as ParameterLocation | undefined;
  if (!name || !location || !PARAMETER_LOCATIONS.includes(location)) {
    return undefined;
  }
  let schema = asSchema(value['schema']);
  if (!schema && isObject(value['content'])) {
    const media = Object.values(value['content']).find(isObject);
    schema = media ? asSchema(media['schema']) : undefined;
  }
  return {
    name,
    in: location,
    required: location === 'path' ? true : value['required'] === true,
    description: asString(value['description']),
    deprecated: value['deprecated'] === true || undefined,
    schema,
    example: 'example' in value ? value['example'] : firstExample(value),
    role: parameterRole(name, location),
  };
}

function parseParameters(
  document: OpenApiDocument,
  pathItem: Record<string, unknown>,
  operation: Record<string, unknown>,
) {
  const merged = new Map<string, ContractParameter>();
  for (const source of [pathItem['parameters'], operation['parameters']]) {
    if (!Array.isArray(source)) {
      continue;
    }
    for (const raw of source) {
      const parameter = parseParameter(document, raw);
      if (parameter) {
        merged.set(`${parameter.in}:${parameter.name}`, parameter);
      }
    }
  }
  const order: Record<ParameterLocation, number> = {
    path: 0,
    header: 1,
    query: 2,
    cookie: 3,
  };
  return Array.from(merged.values()).sort(
    (a, b) =>
      order[a.in] - order[b.in] || Number(b.required) - Number(a.required),
  );
}

function parseBody(
  document: OpenApiDocument,
  raw: unknown,
): ContractBody | undefined {
  const { value } = resolveRef(document, raw);
  if (!isObject(value) || !isObject(value['content'])) {
    return undefined;
  }
  const [entry] = Object.entries(value['content']);
  if (!entry) {
    return undefined;
  }
  const [contentType, media] = entry;
  const mediaObject = isObject(media) ? media : {};
  return {
    required: value['required'] === true,
    contentType,
    description: asString(value['description']),
    schema: asSchema(mediaObject['schema']),
    example: firstExample(mediaObject),
  };
}

function parseResponses(document: OpenApiDocument, raw: unknown) {
  if (!isObject(raw)) {
    return [];
  }
  const responses: ContractResponse[] = [];
  for (const [status, rawResponse] of Object.entries(raw)) {
    const { value } = resolveRef(document, rawResponse);
    if (!isObject(value)) {
      continue;
    }
    const content = isObject(value['content'])
      ? Object.entries(value['content'])[0]
      : undefined;
    const media = content && isObject(content[1]) ? content[1] : {};
    const headers = isObject(value['headers'])
      ? Object.entries(value['headers']).flatMap(([name, header]) => {
          const resolved = resolveRef(document, header).value;
          const parameter = isObject(resolved)
            ? parseParameter(document, { ...resolved, name, in: 'header' })
            : undefined;
          return parameter ? [parameter] : [];
        })
      : [];
    responses.push({
      status,
      description: asString(value['description']) || undefined,
      contentType: content?.[0],
      schema: asSchema(media['schema']),
      example: firstExample(media),
      headers,
    });
  }
  return responses.sort((a, b) => statusRank(a.status) - statusRank(b.status));
}

function statusRank(status: string) {
  if (status === 'default') {
    return 1000;
  }
  const numeric = Number(status.replace(/X/gi, '0'));
  return Number.isFinite(numeric) ? numeric : 999;
}

function parseOperations(document: OpenApiDocument) {
  const operations: ContractOperation[] = [];
  if (!isObject(document.paths)) {
    return operations;
  }
  for (const [path, rawPathItem] of Object.entries(document.paths)) {
    if (path.startsWith('x-')) {
      continue;
    }
    const { value: pathItem } = resolveRef(document, rawPathItem);
    if (!isObject(pathItem)) {
      continue;
    }
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];
      if (!isObject(operation)) {
        continue;
      }
      const tags = Array.isArray(operation['tags'])
        ? operation['tags'].filter(
            (tag): tag is string => typeof tag === 'string',
          )
        : [];
      operations.push({
        id: asString(operation['operationId']) ?? `${method} ${path}`,
        method,
        path,
        summary: asString(operation['summary']),
        description: asString(operation['description']),
        tags,
        deprecated: operation['deprecated'] === true,
        parameters: parseParameters(document, pathItem, operation),
        body: parseBody(document, operation['requestBody']),
        responses: parseResponses(document, operation['responses']),
        extensions: restateExtensions(operation),
      });
    }
  }
  return operations;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Classification =
  | { kind: 'handler'; handler: string; mode: HandlerMode }
  | { kind: 'tool'; tool: InvocationToolKind; by: 'byId' | 'byTarget' };

function createClassifier(serviceName: string) {
  const service = escapeRegExp(serviceName);
  const key = '(?:/\\{key\\})?';
  const handler = '([^/{}]+)';
  const handlerPatterns: [RegExp, HandlerMode][] = [
    [new RegExp(`^/restate/call/${service}${key}/${handler}/?$`), 'call'],
    [new RegExp(`^/restate/send/${service}${key}/${handler}/?$`), 'send'],
    [
      new RegExp(
        `^/restate/scope/\\{scope\\}/call/${service}${key}/${handler}/?$`,
      ),
      'scopedCall',
    ],
    [
      new RegExp(
        `^/restate/scope/\\{scope\\}/send/${service}${key}/${handler}/?$`,
      ),
      'scopedSend',
    ],
    [
      new RegExp(
        `^/restate/invocation/${service}${key}/${handler}/\\{idempotencyKey\\}/attach/?$`,
      ),
      'attach',
    ],
    [
      new RegExp(
        `^/restate/invocation/${service}${key}/${handler}/\\{idempotencyKey\\}/output/?$`,
      ),
      'output',
    ],
    [new RegExp(`^/${service}${key}/${handler}/send/?$`), 'send'],
    [new RegExp(`^/${service}${key}/${handler}/?$`), 'call'],
  ];
  const workflowPattern = new RegExp(
    `^/restate/workflow/${service}/\\{key\\}/(attach|output)/?$`,
  );
  const toolPattern =
    /^\/restate\/(attach|output|status)(\/\{invocationId\})?\/?$/;

  return (operation: ContractOperation): Classification | undefined => {
    const tool = operation.path.match(toolPattern);
    if (tool) {
      return {
        kind: 'tool',
        tool: tool[1] as InvocationToolKind,
        by: tool[2] ? 'byId' : 'byTarget',
      };
    }
    const workflow = operation.path.match(workflowPattern);
    if (workflow) {
      const mode = workflow[1] as 'attach' | 'output';
      const suffix = mode === 'attach' ? 'Attach' : 'Output';
      const name = operation.id.endsWith(suffix)
        ? operation.id.slice(0, -suffix.length)
        : undefined;
      return name ? { kind: 'handler', handler: name, mode } : undefined;
    }
    if (operation.method !== 'POST' && operation.method !== 'GET') {
      return undefined;
    }
    for (const [pattern, mode] of handlerPatterns) {
      const match = operation.path.match(pattern);
      const name = match?.[1];
      if (!name) {
        continue;
      }
      const isReadMode = mode === 'attach' || mode === 'output';
      if (isReadMode !== (operation.method === 'GET')) {
        continue;
      }
      return { kind: 'handler', handler: decodeURIComponent(name), mode };
    }
    return undefined;
  };
}

function isDefaultDescription(
  description: string | undefined,
  serviceName: string,
  handlerName: string,
) {
  if (!description) {
    return true;
  }
  return [
    `Call ${serviceName} handler ${handlerName} and wait for response`,
    `Send request to ${serviceName} handler ${handlerName}`,
    `Call ${serviceName} handler ${handlerName} within the concurrency scope and wait for response`,
    `Send request to ${serviceName} handler ${handlerName} within the concurrency scope`,
  ].includes(description);
}

function parseSecurity(document: OpenApiDocument): ContractSecurity {
  const components = isObject(document.components) ? document.components : {};
  const schemes = isObject(components['securitySchemes'])
    ? components['securitySchemes']
    : {};
  const requirements = Array.isArray(document.security)
    ? document.security
    : [];
  for (const requirement of requirements) {
    if (!isObject(requirement)) {
      continue;
    }
    for (const name of Object.keys(requirement)) {
      const { value: scheme } = resolveRef(document, schemes[name]);
      if (
        isObject(scheme) &&
        scheme['type'] === 'http' &&
        String(scheme['scheme']).toLowerCase() === 'bearer'
      ) {
        return { bearer: true, description: asString(scheme['description']) };
      }
    }
  }
  return { bearer: false };
}

export function isSupportedOpenApiVersion(version: string) {
  return /^3\.1(\.\d+)?$/.test(version);
}

export function parseServiceContract(
  document: OpenApiDocument,
): ServiceContract {
  const openapi = asString(document.openapi) ?? '';
  const info = isObject(document.info) ? document.info : {};
  const name = asString(info['title']) ?? 'Service';
  const operations = parseOperations(document);
  const classify = createClassifier(name);

  const handlers = new Map<string, ContractHandler>();
  const tools = new Map<InvocationToolKind, ContractInvocationTool>();
  const otherOperations: ContractOperation[] = [];

  for (const operation of operations) {
    const classification = classify(operation);
    if (classification?.kind === 'handler') {
      const handler = handlers.get(classification.handler) ?? {
        name: classification.handler,
        extensions: {},
        modes: {},
      };
      if (handler.modes[classification.mode]) {
        otherOperations.push(operation);
        continue;
      }
      handler.modes[classification.mode] = operation;
      handlers.set(handler.name, handler);
    } else if (classification?.kind === 'tool') {
      const tool = tools.get(classification.tool) ?? {
        kind: classification.tool,
      };
      tool[classification.by] = operation;
      tools.set(classification.tool, tool);
    } else {
      otherOperations.push(operation);
    }
  }

  for (const handler of handlers.values()) {
    const primary = HANDLER_MODES.map((mode) => handler.modes[mode]).find(
      Boolean,
    );
    handler.extensions = primary?.extensions ?? {};
    const description = HANDLER_MODES.map(
      (mode) => handler.modes[mode]?.description,
    ).find((candidate) => !isDefaultDescription(candidate, name, handler.name));
    handler.description = description;
  }

  const components = isObject(document.components) ? document.components : {};
  const schemas = isObject(components['schemas'])
    ? Object.fromEntries(
        Object.entries(components['schemas']).flatMap(([key, schema]) => {
          const value = asSchema(schema);
          return value === undefined ? [] : [[key, value]];
        }),
      )
    : {};
  const servers = Array.isArray(document.servers) ? document.servers : [];
  const firstServer = servers.find(isObject);

  return {
    openapi,
    isSupportedVersion: isSupportedOpenApiVersion(openapi),
    name,
    version:
      info['version'] === undefined || info['version'] === null
        ? undefined
        : String(info['version']),
    description: asString(info['description']) || undefined,
    extensions: restateExtensions(info),
    serverUrl: firstServer ? asString(firstServer['url']) : undefined,
    security: parseSecurity(document),
    handlers: Array.from(handlers.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    invocationTools: INVOCATION_TOOLS.flatMap((kind) => {
      const tool = tools.get(kind);
      return tool ? [tool] : [];
    }),
    otherOperations,
    schemas,
    document,
  };
}

export function findOperation(contract: ServiceContract, id: string) {
  for (const handler of contract.handlers) {
    for (const operation of Object.values(handler.modes)) {
      if (operation?.id === id) {
        return { handler, operation };
      }
    }
  }
  return undefined;
}
