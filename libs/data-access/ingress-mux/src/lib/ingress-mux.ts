import { RestateError } from '@restate/util-errors';

export const TENANT_HEADER = 'x-restate-tenant';

async function toError(response: Response) {
  const text = await response.text();
  let message = text;
  let code: string | undefined;
  try {
    const body = JSON.parse(text) as { message?: unknown; code?: unknown };
    if (typeof body.message === 'string') {
      message = body.message;
    }
    if (body.code !== undefined && body.code !== null) {
      code = String(body.code);
    }
  } catch {
    message = text;
  }
  return new RestateError(
    message || `The ingress mux answered ${response.status}`,
    code,
    undefined,
    undefined,
    response.status,
  );
}

export async function muxPost<T>({
  muxUrl,
  scope,
  path,
  body,
  headers,
  signal,
}: {
  muxUrl: string;
  scope: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<T> {
  const response = await fetch(`${muxUrl.replace(/\/+$/, '')}${path}`, {
    method: 'POST',
    signal,
    headers: {
      accept: 'application/json',
      [TENANT_HEADER]: scope,
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
