import ky, { HTTPError } from 'ky';
import { convertInvocation } from './convertInvocation';
import { match } from 'path-to-regexp';
import { convertJournal } from './convertJournal';
import type { FilterItem, Handler } from '@restate/data-access/admin-api/spec';
import { RestateError } from '@restate/util/errors';
import { convertFilters } from './convertFilters';
import { stateVersion } from './stateVersion';

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
      timeout: 60_000,
    })
    .json<{ rows: any[] }>();
}

const INVOCATIONS_LIMIT = 500;

async function listInvocations(
  baseUrl: string,
  headers: Headers,
  filters: FilterItem[]
) {
  const totalCountPromise = queryFetcher(
    `SELECT COUNT(*) AS total_count FROM sys_invocation ${convertFilters(
      filters
    )}`,
    { baseUrl, headers }
  ).then(({ rows }) => rows?.at(0)?.total_count as number);
  const invocationsPromise = queryFetcher(
    `SELECT * FROM sys_invocation ${convertFilters(
      filters
    )} ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
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
        'Invocation not found. Please note that completed invocations are retained only for workflows and those with idempotency keys, and solely for the retention period specified by the service.',
    }),
    {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// TODO: add limit
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
  ).then(({ rows }) =>
    rows.map((entry, _, allEntries) => convertJournal(entry, allEntries))
  );
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getInbox(
  service: string,
  key: string,
  invocationId: string | undefined,
  baseUrl: string,
  headers: Headers
) {
  const [head, size, position] = await Promise.all([
    ky
      .get(`${baseUrl}/services/${service}/handlers`)
      .json<{ handlers: Handler[] }>()
      .then(({ handlers }) =>
        handlers
          .filter((handler) => handler.ty === 'Exclusive')
          .map((handler) => `'${handler.name}'`)
      )
      .then((handlers) =>
        handlers.length > 0
          ? queryFetcher(
              `SELECT id FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN (${handlers.join(
                ', '
              )})`,
              {
                baseUrl,
                headers,
              }
            )
          : { rows: [] }
      )
      .then(({ rows }) => rows.at(0)?.id),
    queryFetcher(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
      {
        baseUrl,
        headers,
      }
    ).then(({ rows }) => rows.at(0)?.size),
    invocationId
      ? queryFetcher(
          `SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}'`,
          { baseUrl, headers }
        )
          .then(({ rows }) =>
            rows.length === 0
              ? { rows: [{ position: -1 }] }
              : queryFetcher(
                  `SELECT COUNT(*) AS position FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}' AND sequence_number < ${
                    rows.at(0).sequence_number
                  }`,
                  {
                    baseUrl,
                    headers,
                  }
                )
          )
          .then(({ rows }) => rows.at(0)?.position)
      : null,
  ]);

  if (typeof size === 'number') {
    const isInvocationHead = head === invocationId;
    return new Response(
      JSON.stringify({
        head,
        size: size + Number(!!head),
        ...(typeof position === 'number' &&
          (position >= 0 || isInvocationHead) &&
          invocationId && {
            [invocationId]: isInvocationHead ? 0 : position + 1,
          }),
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
  const state: { name: string; value: string; bytes: string }[] =
    await queryFetcher(
      `SELECT key, value_utf8, value FROM state WHERE service_name = '${service}' AND service_key = '${key}'`,
      { baseUrl, headers }
    ).then(({ rows }) =>
      rows.map((row) => ({
        name: row.key,
        value: row.value_utf8,
        bytes: row.value,
      }))
    );
  const version = await stateVersion(state);

  return new Response(JSON.stringify({ state, version }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// TODO: add limit
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

async function queryState(
  service: string,
  baseUrl: string,
  headers: Headers,
  filters: FilterItem[]
) {
  if (filters.length > 1) {
    throw new Error('Only one filter is supported');
  }

  const [filter] = filters;
  const filtersWithService: FilterItem[] = [
    {
      field: 'service_name',
      operation: 'EQUALS',
      value: service,
      type: 'STRING',
    },
    ...(filter && filter.field !== 'service_key'
      ? ([
          {
            field: 'key',
            operation: 'EQUALS',
            value: filter.field,
            type: 'STRING',
          },
          {
            ...filter,
            field: 'value_utf8',
          },
        ] as FilterItem[])
      : []),
    ...(filter && filter.field === 'service_key' ? [filter] : []),
  ];

  const query = `SELECT DISTINCT service_key
    FROM state ${convertFilters(filtersWithService)} 
    LIMIT 4500`;

  const resultsPromise: Promise<{
    keys: string[];
  }> = queryFetcher(query, {
    baseUrl,
    headers,
  }).then(async ({ rows }) => ({
    keys: rows.map(({ service_key }) => service_key),
  }));

  const [{ keys }] = await Promise.all([resultsPromise]);

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function listState(
  service: string,
  baseUrl: string,
  headers: Headers,
  keys: string[]
) {
  if (keys.length === 0) {
    return new Response(JSON.stringify({ objects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const query = keys
    .map((key) => {
      return `SELECT service_key, key, value_utf8
    FROM state WHERE service_name = '${service}' AND service_key = '${key}'`;
    })
    .join(' UNION ALL ');

  const resultsPromise: Promise<
    {
      key: string;
      state: { name: string; value: string }[];
    }[]
  > = queryFetcher(query, {
    baseUrl,
    headers,
  }).then(async ({ rows }) => {
    const results: Record<
      string,
      { key: string; state: Record<string, string> }
    > = rows.reduce(
      (p, c) => {
        return {
          ...p,
          [c.service_key]: {
            ...p[c.service_key],
            state: {
              ...p[c.service_key].state,
              [c.key]: c.value_utf8,
            },
          },
        };
      },
      keys.reduce((p, c) => {
        return { ...p, [c]: { key: c, state: {} } };
      }, {})
    );
    return Object.values(results).map((object) => ({
      key: object.key,
      state: Object.entries(object.state).map(([name, value]) => ({
        name,
        value,
      })),
    }));
  });

  const objects = await resultsPromise;

  return new Response(JSON.stringify({ objects }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function query(req: Request) {
  return queryHandler(req).catch(async (error) => {
    if (error instanceof HTTPError) {
      const body = await error.response.json();
      return new Response(JSON.stringify(new RestateError(body.message)), {
        status: error.response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.log('/query call failed!', error);
      return new Response(
        JSON.stringify(new RestateError('Oops something went wrong!')),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  });
}

async function queryHandler(req: Request) {
  const { url, method, headers } = req;
  const urlObj = new URL(url);

  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { filters = [] } = await req.json();
    return listInvocations(baseUrl, headers, filters);
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
      urlObj.searchParams.has('invocationId')
        ? String(urlObj.searchParams.get('invocationId'))
        : undefined,
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

  const getStateInterfaceParams = match<{ name: string }>(
    '/query/services/:name/state/keys'
  )(urlObj.pathname);

  if (getStateInterfaceParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getStateInterface(
      getStateInterfaceParams.params.name,
      baseUrl,
      headers
    );
  }

  const getQueryStateParams = match<{ name: string }>(
    '/query/services/:name/state/query'
  )(urlObj.pathname);

  if (getQueryStateParams && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { filters = [] } = await req.json();
    return queryState(
      getQueryStateParams.params.name,
      baseUrl,
      headers,
      filters
    );
  }

  const getListStateParams = match<{ name: string }>(
    '/query/services/:name/state'
  )(urlObj.pathname);

  if (getListStateParams && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { keys = [] } = await req.json();
    return listState(getListStateParams.params.name, baseUrl, headers, keys);
  }

  return new Response('Not implemented', { status: 501 });
}
