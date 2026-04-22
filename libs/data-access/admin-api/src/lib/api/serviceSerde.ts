import type { operations } from '@restate/data-access/admin-api-spec';
import { adminApi } from './client';

type ServiceSerdeName =
  operations['decode_service_serde']['parameters']['path']['serdeName'];

type DecodeServiceSerdeBody = string | Uint8Array;

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
    body?: DecodeServiceSerdeBody;
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
      body: body as operations['decode_service_serde']['requestBody']['content']['application/octet-stream'],
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
    body?:
      | operations['encode_service_serde']['requestBody']['content']['application/json']
      | Uint8Array;
    deployment?: string;
  },
) {
  return adminApi<
    '/internal/services/{service}/serdes/encode/{serdeName}',
    'post',
    operations['encode_service_serde']['parameters'],
    operations['encode_service_serde']['requestBody']['content']['application/json'],
    ArrayBuffer
  >('query', '/internal/services/{service}/serdes/encode/{serdeName}', 'post', {
    baseUrl,
    body: body as operations['encode_service_serde']['requestBody']['content']['application/json'],
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
}

export function getServiceKeyStateQueryOptions(
  baseUrl: string,
  { service, key }: { service: string; key: string },
) {
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
