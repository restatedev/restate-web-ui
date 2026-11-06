export type JsonSchemaObject = { [keyword: string]: unknown };
export type JsonSchema = boolean | JsonSchemaObject;

export type OpenApiDocument = {
  openapi?: unknown;
  info?: {
    title?: unknown;
    version?: unknown;
    description?: unknown;
    [key: string]: unknown;
  };
  servers?: unknown;
  paths?: unknown;
  components?: unknown;
  security?: unknown;
  tags?: unknown;
  [key: string]: unknown;
};

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE';

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

export type ParameterRole =
  | 'key'
  | 'scope'
  | 'idempotencyKey'
  | 'limitKey'
  | 'delay'
  | 'invocationId';

export interface ContractParameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  description?: string;
  deprecated?: boolean;
  schema?: JsonSchema;
  example?: unknown;
  role?: ParameterRole;
}

export interface ContractBody {
  required: boolean;
  contentType: string;
  description?: string;
  schema?: JsonSchema;
  example?: unknown;
}

export interface ContractResponse {
  status: string;
  description?: string;
  contentType?: string;
  schema?: JsonSchema;
  example?: unknown;
  headers: ContractParameter[];
}

export interface ContractOperation {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  parameters: ContractParameter[];
  body?: ContractBody;
  responses: ContractResponse[];
  extensions: Record<string, string>;
}

export const HANDLER_MODES = [
  'call',
  'send',
  'scopedCall',
  'scopedSend',
  'attach',
  'output',
] as const;
export type HandlerMode = (typeof HANDLER_MODES)[number];

export interface ContractHandler {
  name: string;
  description?: string;
  extensions: Record<string, string>;
  modes: Partial<Record<HandlerMode, ContractOperation>>;
}

export const INVOCATION_TOOLS = ['attach', 'output', 'status'] as const;
export type InvocationToolKind = (typeof INVOCATION_TOOLS)[number];

export interface ContractInvocationTool {
  kind: InvocationToolKind;
  byId?: ContractOperation;
  byTarget?: ContractOperation;
}

export interface ContractSecurity {
  bearer: boolean;
  description?: string;
}

export interface ServiceContract {
  openapi: string;
  isSupportedVersion: boolean;
  name: string;
  version?: string;
  description?: string;
  extensions: Record<string, string>;
  serverUrl?: string;
  security: ContractSecurity;
  handlers: ContractHandler[];
  invocationTools: ContractInvocationTool[];
  otherOperations: ContractOperation[];
  schemas: Record<string, JsonSchema>;
  document: OpenApiDocument;
}
