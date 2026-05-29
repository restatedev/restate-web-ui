import { UnauthorizedError, RestateError } from '@restate/util/errors';
import { getQueryClient } from '@restate/util/react-query';
import { getAuthToken } from '@restate/util/api-config';
import type { Middleware } from 'openapi-fetch';
import { client } from './client';
import { metaQueryOptions } from './meta';

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getAuthToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    // Meta headers are read by the in-browser `/query/*` handler only
    // (the real admin server ignores them). `ensureQueryData` doubles
    // as the per-baseUrl readiness gate — the first `/query/*` for a
    // never-seen env waits for `/version` to land.
    if (new URL(request.url).pathname.includes('/query/')) {
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const meta = await getQueryClient().ensureQueryData(
        metaQueryOptions(baseUrl),
      );
      if (meta?.version) {
        request.headers.set('x-restate-version', meta.version);
      }
      const enabled = meta?.features
        ? Object.entries(meta.features)
            .filter(([, on]) => on)
            .map(([name]) => name)
        : [];
      if (enabled.length > 0) {
        request.headers.set('x-restate-features', enabled.join(','));
      }
    }
    return request;
  },
};

const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedError();
      }
      const body:
        | string
        | {
            message: string;
            restate_code?: string | null;
          } = response.headers.get('content-type')?.includes('json')
        ? await response.clone().json()
        : await response.clone().text();
      if (typeof body === 'object' && body) {
        throw new RestateError(
          body.message,
          body.restate_code ?? '',
          undefined,
          undefined,
          response.status,
        );
      }
      throw new RestateError(
        body || 'An unexpected error occurred. Please try again later.',
        undefined,
        undefined,
        undefined,
        response.status,
      );
    }
    return response;
  },
};

client.use(authMiddleware);
client.use(errorMiddleware);
