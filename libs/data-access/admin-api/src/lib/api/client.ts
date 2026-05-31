import { query } from '@restate/data-access/query';
import type { paths } from '@restate/data-access/admin-api-spec';
import type { BodySerializer } from 'openapi-fetch';
import createClient from 'openapi-fetch';

function getHeader(
  headers: Headers | Record<string, unknown> | undefined,
  name: string,
) {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function getMediaType(headers: Headers | Record<string, unknown> | undefined) {
  return getHeader(headers, 'Content-Type')
    ?.split(';')
    .at(0)
    ?.trim()
    .toLowerCase();
}

const adminBodySerializer = ((body: unknown, headers?: Headers) => {
  const mediaType = getMediaType(headers);

  if (mediaType === 'application/octet-stream') {
    if (
      typeof body === 'string' ||
      ArrayBuffer.isView(body) ||
      body instanceof Blob
    ) {
      return body;
    }
  }

  if (
    mediaType === 'application/json' &&
    (ArrayBuffer.isView(body) || body instanceof Blob)
  ) {
    return body;
  }

  return JSON.stringify(body);
}) as BodySerializer<any>;

export const client = createClient<paths>({
  bodySerializer: adminBodySerializer,
  fetch: (input: Request) => {
    if (new URL(input.url).pathname.startsWith('/query/')) {
      return query(input);
    }
    return globalThis.fetch(input);
  },
});
