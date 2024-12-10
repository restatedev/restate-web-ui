import {
  InvocationComputedStatus,
  RawInvocation,
} from '@restate/data-access/admin-api';
import { convertInvocation } from './convertInvocation';

function query(query: string, { baseUrl }: { baseUrl: string }) {
  return fetch(`${baseUrl}/query`, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
}

const INVOCATIONS_LIMIT = 500;

function listInvocations(baseUrl: string) {
  const totalCountPromise = query(
    'SELECT COUNT(*) AS total_count FROM sys_invocation',
    { baseUrl }
  )
    .then((res) => res.json())
    .then(({ rows }) => rows?.at(0)?.total_count);
  return query(
    `SELECT * FROM sys_invocation ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
    {
      baseUrl,
    }
  ).then(async (res) => {
    if (res.ok) {
      const jsonResponse = await res.json();
      const total_count = await totalCountPromise;
      return new Response(
        JSON.stringify({
          ...jsonResponse,
          limit: INVOCATIONS_LIMIT,
          total_count,
          rows: jsonResponse.rows.map(convertInvocation),
        }),
        {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        }
      );
    }
    return res;
  });
}

export function queryMiddlerWare(req: Request) {
  const { url, method } = req;
  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl);
  }
}
