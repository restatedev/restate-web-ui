import type { operations } from '@restate/data-access/admin-api-spec';
import { adminApi } from './client';

type ServiceSerdeName =
  operations['decode_service_serde']['parameters']['path']['serdeName'];

type DecodeServiceSerdeBody =
  operations['decode_service_serde']['requestBody']['content']['application/octet-stream'];

export function getDecodeServiceSerdeQueryOptions(
  baseUrl: string,
  {
    service,
    serdeName,
    body,
    deployment,
  }: {
    service: string;
    serdeName: ServiceSerdeName;
    body?: string | Uint8Array;
    deployment?: string;
  },
) {
  return adminApi(
    'query',
    '/internal/services/{service}/serdes/decode/{serdeName}',
    'post',
    {
      baseUrl,
      parameters: {
        path: { service, serdeName },
        query: deployment ? { deployment } : undefined,
      },
      body: body as DecodeServiceSerdeBody,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/octet-stream',
      },
    },
  );
}

export function getEncodeServiceSerdeQueryOptions(
  baseUrl: string,
  {
    service,
    serdeName,
    body,
    deployment,
  }: {
    service: string;
    serdeName: ServiceSerdeName;
    body?: operations['encode_service_serde']['requestBody']['content']['application/json'];
    deployment?: string;
  },
) {
  const queryOptions = adminApi<
    '/internal/services/{service}/serdes/encode/{serdeName}',
    'post',
    operations['encode_service_serde']['parameters'],
    operations['encode_service_serde']['requestBody']['content']['application/json'],
    Uint8Array
  >('query', '/internal/services/{service}/serdes/encode/{serdeName}', 'post', {
    baseUrl,
    body,
    parameters: {
      path: { service, serdeName },
      query: deployment ? { deployment } : undefined,
    },
    headers: {
      Accept: 'application/octet-stream',
      'Content-Type': 'application/json',
    },
    parseAs: 'arrayBuffer',
  });

  return {
    ...queryOptions,
    queryFn: ((...args) =>
      Promise.resolve(queryOptions.queryFn(...args)).then((data) =>
        data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer),
      )) as typeof queryOptions.queryFn,
  };
}

export function getServiceKeyStateQueryOptions(
  baseUrl: string,
  { service, key, scope }: { service: string; key: string; scope?: string },
) {
  if (scope !== undefined) {
    return adminApi(
      'query',
      '/query/services/{name}/scopes/{scope}/keys/{key}/state',
      'get',
      {
        baseUrl,
        parameters: { path: { key, name: service, scope } },
      },
    );
  }
  return adminApi('query', '/query/services/{name}/keys/{key}/state', 'get', {
    baseUrl,
    parameters: { path: { key, name: service } },
  });
}

export function getSetServiceStateMutationOptions(
  baseUrl: string,
  { service }: { service: string },
) {
  return adminApi('mutate', '/services/{service}/state', 'post', {
    baseUrl,
    resolvedPath: `/services/${service}/state`,
  });
}
