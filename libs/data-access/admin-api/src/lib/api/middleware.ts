import { UnauthorizedError, RestateError } from '@restate/util/errors';
import { getQueryClient } from '@restate/util/react-query';
import { getAuthToken } from '@restate/util/api-config';
import type { Middleware } from 'openapi-fetch';
import type { components } from '@restate/data-access/admin-api-spec';
import semverCoerce from 'semver/functions/coerce';
import semverGte from 'semver/functions/gte';
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

const versionFeaturesMiddleware: Middleware = {
  async onResponse({ schemaPath, response }) {
    if (schemaPath !== '/version' || !response.ok) return response;

    const data: components['schemas']['VersionInformation'] = await response
      .clone()
      .json();
    const version = semverCoerce(data.version);
    if (!version || !semverGte(version, '1.8.0')) return response;

    // Temporary workaround for experimental flags removed in Restate 1.8.
    // We should probably remove this once consumers use version-aware capabilities.
    return Response.json(
      {
        ...data,
        features: {
          vqueues: true,
          scoped_virtual_objects: true,
          protocol_v7: true,
          vqueues_migration_skip_completed: false,
          ...data.features,
        },
      },
      response,
    );
  },
};

client.use(authMiddleware);
client.use(errorMiddleware);
client.use(versionFeaturesMiddleware);
