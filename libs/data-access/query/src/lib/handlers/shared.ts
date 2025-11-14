import ky from 'ky';

export type QueryContext = {
  query: (sql: string) => Promise<{ rows: any[] }>;
  adminApi: <T>(
    path: string,
    options?: { method?: string; json?: unknown },
  ) => Promise<T>;
  baseUrl: string;
  restateVersion: string;
};

function queryFetcher(
  query: string,
  { baseUrl, headers = new Headers() }: { baseUrl: string; headers: Headers },
) {
  const queryHeaders = new Headers(headers);
  queryHeaders.set('accept', 'application/json');
  queryHeaders.set('content-type', 'application/json');

  return ky
    .post(`${baseUrl}/query`, {
      json: { query },
      headers: queryHeaders,
      timeout: 60_000,
    })
    .json<{ rows: any[] }>();
}

function adminApiFetcher<T>(
  path: string,
  {
    baseUrl,
    headers = new Headers(),
    method = 'GET',
    json,
  }: {
    baseUrl: string;
    headers: Headers;
    method?: string;
    json?: unknown;
  },
): Promise<T> {
  const apiHeaders = new Headers(headers);
  apiHeaders.set('accept', 'application/json');
  if (json) {
    apiHeaders.set('content-type', 'application/json');
  }

  return ky(`${baseUrl}${path}`, {
    method,
    headers: apiHeaders,
    json,
    timeout: 60_000,
  }).json<T>();
}

export function createQueryContext(
  baseUrl: string,
  headers: Headers,
  restateVersion: string,
): QueryContext {
  return {
    query: (sql: string) => queryFetcher(sql, { baseUrl, headers }),
    adminApi: <T>(
      path: string,
      options?: { method?: string; json?: unknown },
    ) =>
      adminApiFetcher<T>(path, {
        baseUrl,
        headers,
        method: options?.method,
        json: options?.json,
      }),
    baseUrl,
    restateVersion,
  };
}
