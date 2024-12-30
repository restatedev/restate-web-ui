import ky from 'ky';
import { convertInvocation } from './convertInvocation';
import { match } from 'path-to-regexp';
import { convertJournal } from './convertJournal';

function queryFetcher(
  query: string,
  { baseUrl, headers = new Headers() }: { baseUrl: string; headers: Headers }
) {
  const queryHeaders = new Headers(headers);
  queryHeaders.set('accept', 'application/json');
  queryHeaders.set('content-type', 'application/json');

  return ky
    .post(`${baseUrl}/query`, {
      json: { query },
      headers: queryHeaders,
    })
    .json<{ rows: any[] }>();
}

const INVOCATIONS_LIMIT = 500;

async function listInvocations(baseUrl: string, headers: Headers) {
  const totalCountPromise = queryFetcher(
    'SELECT COUNT(*) AS total_count FROM sys_invocation',
    { baseUrl, headers }
  ).then(({ rows }) => rows?.at(0)?.total_count as number);
  const invocationsPromise = queryFetcher(
    `SELECT * FROM sys_invocation ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
    {
      baseUrl,
      headers,
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

async function getInvocation(
  invocationId: string,
  baseUrl: string,
  headers: Headers
) {
  const invocations = await queryFetcher(
    `SELECT * FROM sys_invocation WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    }
  ).then(({ rows }) => rows.map(convertInvocation));
  if (invocations.length > 0) {
    return new Response(JSON.stringify(invocations.at(0)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      message:
        'Invocation not found. Please note that completed invocations without idempotency keys are not persisted. For invocations with idempotency keys, the response is retained for a configured retention period per service.',
    }),
    {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function getInvocationJournal(
  invocationId: string,
  baseUrl: string,
  headers: Headers
) {
  const entries = await queryFetcher(
    `SELECT * FROM sys_journal WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    }
  ).then(({ rows }) => rows.map(convertJournal));
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getInbox(
  service: string,
  key: string,
  invocationId: string,
  baseUrl: string,
  headers: Headers
) {
  const [head, size, position] = await Promise.all([
    queryFetcher(
      `SELECT * FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled')`,
      {
        baseUrl,
        headers,
      }
    ).then(({ rows }) => rows.at(0)?.id),
    queryFetcher(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
      {
        baseUrl,
        headers,
      }
    ).then(({ rows }) => rows.at(0)?.size),
    queryFetcher(
      `SELECT COUNT(*) AS position FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}' AND sequence_number < (SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}')`,
      {
        baseUrl,
        headers,
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

async function getState(
  service: string,
  key: string,
  baseUrl: string,
  headers: Headers
) {
  const state: { name: string; value: string }[] = await queryFetcher(
    `SELECT key, value_utf8 FROM state WHERE service_name = '${service}' AND service_key = '${key}'`,
    { baseUrl, headers }
  ).then(({ rows }) =>
    rows.map((row) => ({ name: row.key, value: row.value_utf8 }))
  );

  return new Response(JSON.stringify({ state }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getStateInterface(
  service: string,
  baseUrl: string,
  headers: Headers
) {
  const keys: { name: string }[] = await queryFetcher(
    `SELECT DISTINCT key FROM state WHERE service_name = '${service}' GROUP BY key`,
    { baseUrl, headers }
  ).then(({ rows }) => rows.map((row) => ({ name: row.key })));

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function query(req: Request) {
  const { url, method, headers } = req;
  const urlObj = new URL(url);

  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl, headers);
  }

  const getInvocationJournalParams = match<{ invocationId: string }>(
    '/query/invocations/:invocationId/journal'
  )(urlObj.pathname);
  if (getInvocationJournalParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocationJournal(
      getInvocationJournalParams.params.invocationId,
      baseUrl,
      req.headers
    );
  }

  const getInvocationParams = match<{ invocationId: string }>(
    '/query/invocations/:invocationId'
  )(urlObj.pathname);
  if (getInvocationParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocation(
      getInvocationParams.params.invocationId,
      baseUrl,
      headers
    );
  }

  const getInboxParams =
    match<{ key: string; name: string }>(
      '/query/virtualObjects/:name/keys/:key/queue'
    )(urlObj.pathname) ||
    match<{ key: string; name: string }>(
      '/query/virtualObjects/:name/keys//queue'
    )(urlObj.pathname);

  if (getInboxParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInbox(
      getInboxParams.params.name,
      getInboxParams.params.key ?? '',
      String(urlObj.searchParams.get('invocationId')),
      baseUrl,
      headers
    );
  }

  const getStateParams =
    match<{ key: string; name: string }>(
      '/query/services/:name/keys/:key/state'
    )(urlObj.pathname) ||
    match<{ key: string; name: string }>('/query/services/:name/keys//state')(
      urlObj.pathname
    );

  if (getStateParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getState(
      getStateParams.params.name,
      getStateParams.params.key ?? '',
      baseUrl,
      headers
    );
  }

  const getStateInterfaceParams = match<{ key: string; name: string }>(
    '/query/services/:name/state'
  )(urlObj.pathname);

  if (getStateInterfaceParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getStateInterface(
      getStateInterfaceParams.params.name,
      baseUrl,
      headers
    );
  }

  return null;
}
