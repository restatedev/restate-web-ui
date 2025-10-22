import ky from 'ky';

export function queryFetcher(
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

export const INVOCATIONS_LIMIT = 250;
export const COUNT_LIMIT = 50000;

export function countEstimate(
  receivedLessThanLimit: boolean,
  rows: number,
  minimumCountEstimate: number,
): { total_count: number; total_count_lower_bound: boolean } {
  if (receivedLessThanLimit) {
    return { total_count: rows, total_count_lower_bound: false };
  } else if (rows > minimumCountEstimate) {
    return { total_count: rows, total_count_lower_bound: true };
  } else {
    return {
      total_count: minimumCountEstimate,
      total_count_lower_bound: true,
    };
  }
}
