import ky from 'ky';
import { convertInvocation } from './convertInvocation';
import { match } from 'path-to-regexp';

function query(query: string, { baseUrl }: { baseUrl: string }) {
  return ky
    .post(`${baseUrl}/query`, {
      json: { query },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .json<{ rows: any[] }>();
}

const INVOCATIONS_LIMIT = 500;

async function listInvocations(baseUrl: string) {
  const totalCountPromise = query(
    'SELECT COUNT(*) AS total_count FROM sys_invocation',
    { baseUrl }
  ).then(({ rows }) => rows?.at(0)?.total_count as number);
  const invocationsPromise = query(
    `SELECT * FROM sys_invocation ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
    {
      baseUrl,
    }
  ).then(({ rows }) => rows.map(convertInvocation));

  const [total_count, invocations] = await Promise.all([
    totalCountPromise,
    invocationsPromise,
  ]);

  return new Response(
    JSON.stringify({
      limit: INVOCATIONS_LIMIT,
      total_count,
      rows: invocations,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function getInvocation(invocationId: string, baseUrl: string) {
  const invocations = await query(
    `SELECT * FROM sys_invocation WHERE id = '${invocationId}'`,
    {
      baseUrl,
    }
  ).then(({ rows }) => rows.map(convertInvocation));
  if (invocations.length > 0) {
    return new Response(JSON.stringify(invocations.at(0)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    statusText: 'Not found',
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getInbox(
  service: string,
  key: string,
  invocationId: string,
  baseUrl: string
) {
  const [head, size, position] = await Promise.all([
    query(
      `SELECT * FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled')`,
      {
        baseUrl,
      }
    ).then(({ rows }) => rows.at(0)?.id),
    query(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
      {
        baseUrl,
      }
    ).then(({ rows }) => rows.at(0)?.size),
    query(
      `SELECT COUNT(*) AS position FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}' AND sequence_number < (SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}')`,
      {
        baseUrl,
      }
    ).then(({ rows }) => rows.at(0)?.position),
  ]);

  if (
    typeof position === 'number' &&
    typeof size === 'number' &&
    typeof head === 'string'
  ) {
    const isInvocationHead = head === invocationId;
    return new Response(
      JSON.stringify({
        head,
        size: size + 1,
        [invocationId]: isInvocationHead ? 0 : position + 1,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    statusText: 'Not found',
    headers: { 'Content-Type': 'application/json' },
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

  const getInboxParams = match<{ key: string; name: string }>(
    '/query/virtualObjects/:name/keys/:key/queue'
  )(urlObj.pathname);
  if (getInboxParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInbox(
      getInboxParams.params.name,
      getInboxParams.params.key,
      String(urlObj.searchParams.get('invocationId')),
      baseUrl
    );
  }
}
