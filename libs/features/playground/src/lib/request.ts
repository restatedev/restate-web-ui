import {
  bundleSchema,
  generateExample,
  isJsonContentType,
  isObject,
  stringifyExample,
  toFetchInit,
  type buildRequest,
  type ContractOperation,
  type ContractParameter,
  type OpenApiDocument,
  type ServiceContract,
} from '@restate/util-openapi';
import { durationToMs } from './duration';
import { toolDraftName } from './names';
import { toPlaygroundResult, type PlaygroundResult } from './result';
import { sharedRoleValue } from './sessionState';

export function isTextContentType(contentType: string) {
  return isJsonContentType(contentType) || /^text\//i.test(contentType);
}

export function initialParameterValue(
  scope: string,
  parameter: ContractParameter,
) {
  const shared = parameter.role
    ? sharedRoleValue(scope, parameter.role)
    : undefined;
  if (shared) {
    return shared;
  }
  if (parameter.required && parameter.example !== undefined) {
    return String(parameter.example);
  }
  if (
    parameter.required &&
    isObject(parameter.schema) &&
    parameter.schema['default'] !== undefined
  ) {
    return String(parameter.schema['default']);
  }
  return '';
}

export function exampleBody(
  operation: ContractOperation,
  document: OpenApiDocument,
) {
  const body = operation.body;
  if (!body) {
    return '';
  }
  if (body.example !== undefined) {
    return typeof body.example === 'string' &&
      !isJsonContentType(body.contentType)
      ? body.example
      : stringifyExample(body.example);
  }
  if (!isJsonContentType(body.contentType)) {
    return '';
  }
  return stringifyExample(generateExample(body.schema, { root: document }));
}

export function bodyModelUri(
  service: string,
  handlerName: string,
  contentType: string,
) {
  const segment = (name: string) => name.replace(/[^\w.-]/g, '_');
  return `inmemory://playground/${segment(service)}/${segment(handlerName)}.${isJsonContentType(contentType) ? 'json' : 'txt'}`;
}

export function editorSchemas(service: string, contract: ServiceContract) {
  const bodies = [
    ...contract.handlers.map((handler) => ({
      name: handler.name,
      body: Object.values(handler.modes).find((operation) => operation?.body)
        ?.body,
    })),
    ...contract.invocationTools.map((tool) => ({
      name: toolDraftName(tool.kind, 'byTarget'),
      body: tool.byTarget?.body,
    })),
  ];
  return bodies.flatMap(({ name, body }) => {
    if (!body || !isJsonContentType(body.contentType)) {
      return [];
    }
    const schema = bundleSchema(body.schema, contract.document);
    return schema
      ? [{ uri: bodyModelUri(service, name, body.contentType), schema }]
      : [];
  });
}

export function delayError(value: string) {
  if (!value) {
    return undefined;
  }
  return Number.isNaN(durationToMs(value))
    ? 'Use a duration like 10s, 1.5h or PT5M'
    : undefined;
}

export async function execute(
  fetcher: typeof fetch,
  request: ReturnType<typeof buildRequest>,
  signal: AbortSignal,
): Promise<PlaygroundResult | undefined> {
  const outcome = await timedFetch(fetcher, request, signal);
  if (signal.aborted) {
    return undefined;
  }
  if ('response' in outcome) {
    try {
      return await toPlaygroundResult(outcome.response, outcome.durationMs);
    } catch (error) {
      if (signal.aborted) {
        return undefined;
      }
      return {
        kind: 'error',
        url: request.url,
        message: error instanceof Error ? error.message : String(error),
        durationMs: outcome.durationMs,
      };
    }
  }
  return {
    kind: 'error',
    url: request.url,
    message: outcome.error,
    durationMs: outcome.durationMs,
  };
}

export function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function timedFetch(
  fetcher: typeof fetch,
  request: ReturnType<typeof buildRequest>,
  signal: AbortSignal,
): Promise<
  | { response: Response; durationMs: number }
  | { error: string; durationMs: number }
> {
  const start = performance.now();
  try {
    const response = await fetcher(request.url, {
      ...toFetchInit(request),
      signal,
    });
    return { response, durationMs: performance.now() - start };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    };
  }
}
