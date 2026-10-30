export type ParsedId = {
  kind: 'invocation' | 'deployment' | 'vqueue';
  id: string;
};

export interface ParsedInput {
  id?: ParsedId;
  errorCode?: string;
  endpoint?: string;
  limitPattern?: string;
  sql?: string;
  servicePath?: { service: string; rest: string };
}

const ID_KINDS: Record<string, ParsedId['kind']> = {
  inv: 'invocation',
  dp: 'deployment',
  vq: 'vqueue',
};

const ID_PATTERN = /^(inv|dp|vq)_1[0-9A-Za-z]{10,}$/;
const ERROR_CODE_PATTERN = /^(META|RT)\d{4}$/i;
const SQL_PATTERN = /^(select|with|explain|describe|show)\s/i;
const ENDPOINT_PATTERNS = [
  /^(https?|connect|tunnel):\/\/\S+$/i,
  /^arn:aws[\w-]*:lambda:\S+$/i,
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/\S*)?$/i,
  /^[a-z0-9.-]+:\d+(\/\S*)?$/i,
];
const LIMIT_PATTERN = /^(\*|[^\s/*]+)(\/(\*|[^\s/*]+)){0,2}$/;
const SERVICE_PATH_PATTERN = /^([^\s/]+)\/(\S+)$/;

export function parseInput(input: string): ParsedInput {
  const text = input.trim();
  const parsed: ParsedInput = {};
  if (!text) {
    return parsed;
  }

  const kind = ID_KINDS[text.match(ID_PATTERN)?.[1] ?? ''];
  if (kind) {
    parsed.id = { kind, id: text };
    return parsed;
  }

  if (ERROR_CODE_PATTERN.test(text)) {
    parsed.errorCode = text.toUpperCase();
    return parsed;
  }

  if (SQL_PATTERN.test(text)) {
    parsed.sql = text;
    return parsed;
  }

  if (/\s/.test(text)) {
    return parsed;
  }

  if (ENDPOINT_PATTERNS.some((pattern) => pattern.test(text))) {
    parsed.endpoint = text;
    return parsed;
  }

  if (text.includes('*') && LIMIT_PATTERN.test(text)) {
    parsed.limitPattern = text;
    return parsed;
  }

  const servicePath = text.match(SERVICE_PATH_PATTERN);
  if (servicePath?.[1] && servicePath[2]) {
    parsed.servicePath = { service: servicePath[1], rest: servicePath[2] };
  }

  return parsed;
}

function addProtocol(endpoint: string) {
  if (/^([a-z][a-z0-9+.-]*:\/\/|arn:)/i.test(endpoint)) {
    return endpoint;
  }
  return /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(endpoint)
    ? `http://${endpoint}`
    : `https://${endpoint}`;
}

export function normalizeEndpoint(endpoint: string) {
  return addProtocol(endpoint.trim()).replace(/\/+$/, '');
}
