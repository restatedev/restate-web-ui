import ky, { HTTPError } from 'ky';
import { convertInvocation } from './convertInvocation';
import { match } from 'path-to-regexp';
import { convertJournal } from './convertJournal';
import type {
  FilterItem,
  Handler,
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { RestateError } from '@restate/util/errors';
import { convertFilters, convertInvocationsFilters } from './convertFilters';
import { stateVersion } from './stateVersion';
import { convertJournalV2 } from './convertJournalV2';
import {
  JournalRawEntryWithCommandIndex,
  lifeCycles,
} from '@restate/features/service-protocol';
import { hexToBase64 } from '@restate/util/binary';
import { getVersion } from './getVersion';
import semverGt from 'semver/functions/gte';

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

const INVOCATIONS_LIMIT = 250;

async function listInvocations(
  baseUrl: string,
  headers: Headers,
  filters: FilterItem[],
) {
  const totalCountPromise = queryFetcher(
    `SELECT count(1) AS total_count from sys_invocation ${convertInvocationsFilters(filters)}`,
    {
      baseUrl,
      headers,
    },
  ).then(({ rows }) => rows?.at(0)?.total_count);
  const invocationsPromise = queryFetcher(
    `SELECT id from sys_invocation ${convertInvocationsFilters(filters)} ORDER BY modified_at DESC LIMIT ${INVOCATIONS_LIMIT}`,
    {
      baseUrl,
      headers,
    },
  )
    .then(async ({ rows }) => {
      if (rows.length > 0) {
        return queryFetcher(
          `SELECT * from sys_invocation ${convertInvocationsFilters([
            {
              field: 'id',
              type: 'STRING_LIST',
              operation: 'IN',
              value: rows.map(({ id }) => id),
            },
            ...filters,
          ])} ORDER BY modified_at DESC`,
          {
            baseUrl,
            headers,
          },
        );
      } else {
        return { rows: [] };
      }
    })
    .then(({ rows }) => rows.map(convertInvocation));

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
    },
  );
}

async function getInvocation(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const invocations = await queryFetcher(
    `SELECT * FROM sys_invocation WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    },
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
        'Invocation not found or no longer available.\n\nThe requested invocation either does not exist or has already completed and has been removed after its retention period expired. Completed invocations are only retained if a journal retention period is explicitly set, if they are part of a workflow, or if they were invoked with an idempotency key. In all cases, they are retained only for the duration of the specified retention period.',
    }),
    {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// TODO: add limit
async function getInvocationJournal(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const entries = await queryFetcher(
    `SELECT * FROM sys_journal WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    },
  ).then(({ rows }) =>
    rows.map((entry, _, allEntries) => convertJournal(entry, allEntries)),
  );
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getJournalEntryV2(
  invocationId: string,
  entryIndex: number,
  baseUrl: string,
  headers: Headers,
) {
  const journalQuery = await queryFetcher(
    `SELECT id, index, appended_at, entry_type, name, entry_json, version, raw, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}' AND index = '${entryIndex}`,
    {
      baseUrl,
      headers,
    },
  );

  const entry = convertJournalV2(journalQuery.rows?.at(0), [], undefined);

  if (!entry) {
    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(entry), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getInvocationJournalV2(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const restateVersion = getVersion(headers);
  const [invocationQuery, journalQuery, eventsQuery] = await Promise.all([
    queryFetcher(`SELECT * FROM sys_invocation WHERE id = '${invocationId}'`, {
      baseUrl,
      headers,
    }),
    queryFetcher(
      `SELECT id, index, appended_at, entry_type, name, entry_json, raw, version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}'`,
      {
        baseUrl,
        headers,
      },
    ),
    semverGt(restateVersion, '1.4.5')
      ? queryFetcher(
          `SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = '${invocationId}' AND event_type = 'Paused' ORDER BY appended_at DESC LIMIT 1`,
          {
            baseUrl,
            headers,
          },
        )
      : { rows: [] },
  ]);
  const invocation = invocationQuery.rows
    .map(convertInvocation)
    .at(0) as Invocation;

  if (!invocation) {
    return new Response(
      JSON.stringify({
        message:
          'Invocation not found or no longer available.\n\nThe requested invocation either does not exist or has already completed and has been removed after its retention period expired. Completed invocations are only retained if a journal retention period is explicitly set, if they are part of a workflow, or if they were invoked with an idempotency key. In all cases, they are retained only for the duration of the specified retention period.',
      }),
      {
        status: 404,
        statusText: 'Not found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const version = journalQuery.rows.at(0)?.version;

  let commandCount = 0;
  const entriesWithCommandIndex = [
    ...(journalQuery.rows as JournalRawEntry[]),
    ...eventsQuery.rows.map(
      (entry, index) =>
        ({
          ...entry,
          entry_type: entry.event_type,
          index: journalQuery.rows.length + 1,
        }) as JournalRawEntry,
    ),
  ].reduce((results, rawEntry) => {
    if (rawEntry.entry_type?.startsWith('Command:')) {
      results.push({ ...rawEntry, command_index: commandCount });
      commandCount++;
    } else {
      results.push(rawEntry);
    }

    return results;
  }, [] as JournalRawEntryWithCommandIndex[]);

  const entries = entriesWithCommandIndex
    .reduceRight((results, entry) => {
      const convertedEntry = convertJournalV2(entry, results, invocation);
      if (convertedEntry) {
        return [...results, convertedEntry];
      } else {
        return results;
      }
    }, [] as JournalEntryV2[])
    .reverse();

  const entriesWithLifeCycleEvents = [
    ...lifeCycles(entries, invocation),
    ...entries,
  ].sort((a, b) => {
    if (typeof a.index === 'number' && typeof b.index === 'number') {
      return a.index - b.index;
    } else if (typeof a.start === 'string' && typeof b.start === 'string') {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    } else {
      return 0;
    }
  });

  if (
    invocation.last_failure &&
    ((invocation.last_failure_related_entry_index !== undefined &&
      invocation.last_failure_related_entry_index >=
        journalQuery.rows.length) ||
      invocation.last_failure_related_command_index === undefined)
  ) {
    entriesWithLifeCycleEvents.push({
      category: invocation.last_failure_related_entry_name
        ? 'command'
        : 'event',
      type: invocation.last_failure_related_entry_type ?? 'TransientError',
      index: invocation.last_failure_related_entry_index,
      ...(invocation.last_failure_related_entry_type && {
        commandIndex: journalQuery.rows.length,
      }),
      error: new RestateError(
        invocation.last_failure,
        invocation.last_failure_error_code,
      ),
    });
  }

  return new Response(
    JSON.stringify({
      ...invocation,
      journal: { entries: entriesWithLifeCycleEvents, version },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function getInbox(
  service: string,
  key: string,
  invocationId: string | undefined,
  baseUrl: string,
  headers: Headers,
) {
  const [head, size, position] = await Promise.all([
    ky
      .get(`${baseUrl}/services/${service}/handlers`)
      .json<{ handlers: Handler[] }>()
      .then(({ handlers }) =>
        handlers
          .filter((handler) => handler.ty === 'Exclusive')
          .map((handler) => `'${handler.name}'`),
      )
      .then((handlers) =>
        handlers.length > 0
          ? queryFetcher(
              `SELECT id FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN (${handlers.join(
                ', ',
              )})`,
              {
                baseUrl,
                headers,
              },
            )
          : { rows: [] },
      )
      .then(({ rows }) => rows.at(0)?.id),
    queryFetcher(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
      {
        baseUrl,
        headers,
      },
    ).then(({ rows }) => rows.at(0)?.size),
    invocationId
      ? queryFetcher(
          `SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}'`,
          { baseUrl, headers },
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
                  },
                ),
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
      },
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
  headers: Headers,
) {
  const state: { name: string; value: string }[] = await queryFetcher(
    `SELECT key, value_utf8, value FROM state WHERE service_name = '${service}' AND service_key = '${key}'`,
    { baseUrl, headers },
  ).then(({ rows }) =>
    rows.map((row) => ({
      name: row.key,
      value: hexToBase64(row.value) as string,
    })),
  );
  const version = stateVersion(state);

  return new Response(JSON.stringify({ state, version }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// TODO: add limit
async function getStateInterface(
  service: string,
  baseUrl: string,
  headers: Headers,
) {
  const keys: { name: string }[] = await queryFetcher(
    `SELECT DISTINCT key FROM state WHERE service_name = '${service}' GROUP BY key`,
    { baseUrl, headers },
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
  filters: FilterItem[],
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
            field: 'value',
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
  keys: string[],
) {
  if (keys.length === 0) {
    return new Response(JSON.stringify({ objects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const query = `SELECT service_key, key, value
    FROM state WHERE service_name = '${service}' AND service_key IN (${keys.map((key) => `'${key}'`).join(', ')})`;

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
              [c.key]: hexToBase64(c.value),
            },
          },
        };
      },
      keys.reduce((p, c) => {
        return { ...p, [c]: { key: c, state: {} } };
      }, {}),
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

async function extractErrorPayload(res: Response): Promise<string | undefined> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return ((await res.json()) as { message?: string })?.message;
    } catch {
      // fall back if server lied
    }
  }
  return (await res.text()) as string;
}

export async function query(req: Request) {
  return queryHandler(req).catch(async (error) => {
    if (error instanceof HTTPError) {
      const body = await extractErrorPayload(error.response);
      return new Response(
        JSON.stringify(new RestateError(body || 'Oops something went wrong!')),
        {
          status: error.response.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else {
      console.log('/query call failed!', error);
      return new Response(
        JSON.stringify(new RestateError('Oops something went wrong!')),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  });
}

async function queryHandler(req: Request) {
  const { url, method, headers } = req;
  const urlObj = new URL(url);

  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { filters = [] }: { filters: FilterItem[] } = await req.json();
    return listInvocations(baseUrl, headers, filters);
  }

  const getInvocationJournalParams = match<{ invocationId: string }>(
    '/query/invocations/:invocationId/journal',
  )(urlObj.pathname);
  if (getInvocationJournalParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocationJournal(
      getInvocationJournalParams.params.invocationId,
      baseUrl,
      req.headers,
    );
  }

  const getInvocationParams = match<{ invocationId: string }>(
    '/query/invocations/:invocationId',
  )(urlObj.pathname);
  if (getInvocationParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocation(
      getInvocationParams.params.invocationId,
      baseUrl,
      headers,
    );
  }

  const getInboxParams =
    match<{ key: string; name: string }>(
      '/query/virtualObjects/:name/keys/:key/queue',
    )(urlObj.pathname) ||
    match<{ key: string; name: string }>(
      '/query/virtualObjects/:name/keys//queue',
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
      headers,
    );
  }

  const getStateParams =
    match<{ key: string; name: string }>(
      '/query/services/:name/keys/:key/state',
    )(urlObj.pathname) ||
    match<{ key: string; name: string }>('/query/services/:name/keys//state')(
      urlObj.pathname,
    );

  if (getStateParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getState(
      getStateParams.params.name,
      getStateParams.params.key ?? '',
      baseUrl,
      headers,
    );
  }

  const getStateInterfaceParams = match<{ name: string }>(
    '/query/services/:name/state/keys',
  )(urlObj.pathname);

  if (getStateInterfaceParams && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getStateInterface(
      getStateInterfaceParams.params.name,
      baseUrl,
      headers,
    );
  }

  const getQueryStateParams = match<{ name: string }>(
    '/query/services/:name/state/query',
  )(urlObj.pathname);

  if (getQueryStateParams && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { filters = [] }: { filters: FilterItem[] } = await req.json();
    return queryState(
      getQueryStateParams.params.name,
      baseUrl,
      headers,
      filters,
    );
  }

  const getListStateParams = match<{ name: string }>(
    '/query/services/:name/state',
  )(urlObj.pathname);

  if (getListStateParams && method.toUpperCase() === 'POST') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const { keys = [] }: { keys: string[] } = await req.json();
    return listState(getListStateParams.params.name, baseUrl, headers, keys);
  }

  const getInvocationJournalParamsV2 = match<{ invocationId: string }>(
    '/query/v2/invocations/:invocationId',
  )(urlObj.pathname);
  if (getInvocationJournalParamsV2 && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getInvocationJournalV2(
      getInvocationJournalParamsV2.params.invocationId,
      baseUrl,
      req.headers,
    );
  }

  const getJournalEntryParamsV2 = match<{
    invocationId: string;
    entryIndex: string;
  }>('/query/invocations/:invocationId/journal/:entryIndex')(urlObj.pathname);
  if (getJournalEntryParamsV2 && method.toUpperCase() === 'GET') {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return getJournalEntryV2(
      getJournalEntryParamsV2.params.invocationId,
      Number(getJournalEntryParamsV2.params.entryIndex),
      baseUrl,
      req.headers,
    );
  }

  return new Response('Not implemented', { status: 501 });
}
