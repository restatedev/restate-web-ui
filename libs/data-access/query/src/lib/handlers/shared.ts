import ky from 'ky';

export type QueryContext = {
  query: (sql: string) => Promise<{ rows: any[] }>;
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

export function createQueryContext(
  baseUrl: string,
  headers: Headers,
): QueryContext {
  return {
    query: (sql: string) => queryFetcher(sql, { baseUrl, headers }),
  };
}
