import type {
  ContractOperation,
  ContractParameter,
  ParameterLocation,
} from './types.js';

export type RequestBodyValue =
  | { kind: 'text'; text: string }
  | { kind: 'file'; file: Blob; name?: string };

export interface RequestValues {
  parameters: Partial<Record<ParameterLocation, Record<string, string>>>;
  body?: RequestBodyValue;
}

export interface BuildRequestOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface PlaygroundRequest {
  method: string;
  url: string;
  headers: [string, string][];
  body?: RequestBodyValue;
}

export interface RequestIssue {
  field: string;
  message: string;
}

function parameterValue(values: RequestValues, parameter: ContractParameter) {
  return values.parameters[parameter.in]?.[parameter.name] ?? '';
}

function pathValue(parameter: ContractParameter, value: string) {
  return parameter.role === 'idempotencyKey'
    ? value.replace(/[/?#]/g, encodeURIComponent)
    : encodeURIComponent(value);
}

export function parameterField(
  parameter: Pick<ContractParameter, 'in' | 'name'>,
) {
  return `${parameter.in}:${parameter.name}`;
}

export function isJsonContentType(contentType: string | undefined) {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

export function concreteContentType(contentType: string) {
  const [mediaType = '', ...parameters] = contentType.split(';');
  const [type, subtype] = mediaType.trim().split('/');
  if (subtype !== '*') {
    return contentType;
  }
  const concrete =
    !type || type === '*' ? 'application/octet-stream' : `${type}/plain`;
  return [concrete, ...parameters].join(';');
}

export function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function hasRequestBody(
  operation: ContractOperation,
  body: RequestBodyValue | undefined,
) {
  if (!operation.body || !body) {
    return false;
  }
  if (body.kind === 'file') {
    return true;
  }
  const text = isJsonContentType(operation.body.contentType)
    ? body.text.trim()
    : body.text;
  return text.length > 0 || operation.body.required;
}

export function validateRequest(
  operation: ContractOperation,
  values: RequestValues,
): RequestIssue[] {
  return operation.parameters.flatMap((parameter) =>
    parameter.required &&
    parameter.in !== 'cookie' &&
    parameterValue(values, parameter).length === 0
      ? [
          {
            field: parameterField(parameter),
            message: `${parameter.name} is required`,
          },
        ]
      : [],
  );
}

export function buildRequest(
  operation: ContractOperation,
  values: RequestValues,
  { baseUrl, apiKey }: BuildRequestOptions,
): PlaygroundRequest {
  let path = operation.path;
  const query = new URLSearchParams();
  const headers: [string, string][] = [];

  for (const parameter of operation.parameters) {
    const value = parameterValue(values, parameter);
    switch (parameter.in) {
      case 'path':
        if (value.length > 0) {
          path = path.replaceAll(
            `{${parameter.name}}`,
            pathValue(parameter, value),
          );
        }
        break;
      case 'query':
        if (value.length > 0) {
          query.append(parameter.name, value);
        }
        break;
      case 'header':
        if (value.length > 0) {
          headers.push([parameter.name, value]);
        }
        break;
      default:
        break;
    }
  }

  const success = operation.responses.find(
    (response) => response.status.startsWith('2') && response.contentType,
  );
  if (success?.contentType) {
    headers.unshift(['Accept', success.contentType]);
  }

  const withBody = hasRequestBody(operation, values.body);
  if (withBody && operation.body) {
    headers.push([
      'Content-Type',
      concreteContentType(operation.body.contentType),
    ]);
  }
  if (apiKey) {
    headers.push(['Authorization', `Bearer ${apiKey}`]);
  }

  const search = query.toString();
  return {
    method: operation.method,
    url: `${joinUrl(baseUrl, path)}${search ? `?${search}` : ''}`,
    headers,
    body: withBody ? values.body : undefined,
  };
}

export function toFetchInit(request: PlaygroundRequest): RequestInit {
  return {
    method: request.method,
    headers: request.headers,
    body:
      request.body?.kind === 'file'
        ? request.body.file
        : request.body?.kind === 'text'
          ? request.body.text
          : undefined,
  };
}
