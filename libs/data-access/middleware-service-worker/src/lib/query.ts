import { convertInvocation } from './convertInvocation';
import { match } from 'path-to-regexp';

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

function getInvocation(invocationId: string, baseUrl: string) {
  return query(`SELECT * FROM sys_invocation WHERE id = '${invocationId}'`, {
    baseUrl,
  }).then(async (res) => {
    if (res.ok) {
      const jsonResponse = await res.json();
      if (jsonResponse.rows.length > 0) {
        return new Response(
          JSON.stringify({
            ...convertInvocation(jsonResponse.rows.at(0)),
          }),
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          }
        );
      }
      return new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        statusText: 'Not found',
        headers: res.headers,
      });
    }
    return res;
  });
}

function getInbox(key: string, invocationId: string, baseUrl: string) {
  return query(
    `SELECT * FROM sys_inbox WHERE (sequence_number = (SELECT MIN(sequence_number) FROM sys_inbox WHERE service_key = '${key}') OR sequence_number = (SELECT MAX(sequence_number) FROM sys_inbox WHERE service_key = '${key}') OR id = '${invocationId}') AND  service_key = '${key}'`,
    {
      baseUrl,
    }
  ).then(async (res) => {
    if (res.ok) {
      const jsonResponse = await res.json();
      const indexes = (jsonResponse.rows ?? []).map(
        (row: any) => row.sequence_number
      );
      const head = Math.min(...indexes);
      const tail = Math.max(...indexes);
      const headInvocation = jsonResponse.rows?.find(
        (row: any) => row.sequence_number === head
      );
      const queriedInvocation = jsonResponse.rows?.find(
        (row: any) => row.id === invocationId
      );
      if (headInvocation && queriedInvocation) {
        return new Response(
          JSON.stringify({
            head: headInvocation.id,
            size: tail - head + 1,
            [invocationId]: queriedInvocation.sequence_number - head,
          }),
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          }
        );
      }
      return new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        statusText: 'Not found',
        headers: res.headers,
      });
    }
    return res;
  });
}

export function queryMiddlerWare(req: Request) {
  const { url, method } = req;
  const urlObj = new URL(url);

  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl);
  }

  const getInvocationParams = match<{ invocationId: string }>(
    '/query/invocations/:invocationId'
  )(urlObj.pathname);
  if (getInvocationParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocation(getInvocationParams.params.invocationId, baseUrl);
  }

  const getInboxParams = match<{ key: string }>(
    '/query/virtualObjects/:key/inbox'
  )(urlObj.pathname);
  if (getInboxParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInbox(
      getInboxParams.params.key,
      String(urlObj.searchParams.get('invocationId')),
      baseUrl
    );
  }
}
