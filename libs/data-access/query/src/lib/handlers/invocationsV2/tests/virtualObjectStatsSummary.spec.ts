import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils';

const INDEX_HEADERS = {
  'content-type': 'application/json',
  'x-restate-features': 'indexes_v1,track_status_gauges',
};

const OBJECT_FILTERS = [
  {
    field: 'target_service_ty',
    type: 'STRING',
    operation: 'EQUALS',
    value: 'virtual_object',
  },
  {
    field: 'target_service_name',
    type: 'STRING',
    operation: 'EQUALS',
    value: 'Counter',
  },
  {
    field: 'target_service_key',
    type: 'STRING',
    operation: 'EQUALS',
    value: 'hot',
  },
];

const ROWS = [
  ['greet', 'inbox', 'new', 4],
  ['greet', 'inbox', 'scheduled', 1],
  ['greet', 'running', 'started', 1],
  ['add', 'finished', 'succeeded', 9],
].map(([handler, stage, status, num_entries]) => ({
  service_name: 'Counter',
  scope: null,
  key: 'hot',
  handler,
  kind: 'invocation',
  stage,
  status,
  num_entries,
}));

type SummaryResponse = {
  mode: string;
  total: number;
  stageBuckets: { key: string; count: number }[];
};

describe('invocation summary from sys_virtual_object_stats', () => {
  const harness = createInvocationV2QueryTestHarness();

  function respondWithStats() {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_virtual_object_stats') ? ROWS : [],
    );
  }

  it('counts an unscoped object inbox', async () => {
    respondWithStats();

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'count',
        mode: { type: 'sampled', sampleSize: 1_000_000 },
        filters: [
          ...OBJECT_FILTERS,
          { field: 'scope', type: 'NULL', operation: 'IS' },
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['scheduled', 'pending', 'ready', 'yielded', 'backing-off'],
          },
        ],
      },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.mode).toBe('exact');
    expect(body.total).toBe(5);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, scope, key, handler, kind, stage, status, num_entries
      FROM sys_virtual_object_stats
      WHERE service_name = 'Counter'
        AND scope IS NULL
        AND key = 'hot'",
      ]
    `);
  });

  it('builds stage buckets for a scoped object', async () => {
    respondWithStats();

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'all',
        filters: [
          ...OBJECT_FILTERS,
          { field: 'scope', type: 'STRING', operation: 'EQUALS', value: 'a' },
        ],
      },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.total).toBe(15);
    expect(
      Object.fromEntries(
        body.stageBuckets.map(({ key, count }) => [key, count]),
      ),
    ).toEqual({ inbox: 5, running: 1, suspended: 0, paused: 0, finished: 9 });
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, scope, key, handler, kind, stage, status, num_entries
      FROM sys_virtual_object_stats
      WHERE service_name = 'Counter'
        AND scope = 'a'
        AND key = 'hot'",
      ]
    `);
  });

  it('falls back without a virtual object service type filter', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations/summary',
      { view: 'count', filters: OBJECT_FILTERS.slice(1) },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              COUNT(1) AS count
            FROM sys_invocation_status ss
            WHERE ss.target_service_name = 'Counter'
              AND ss.target_service_key = 'hot'",
      ]
    `);
  });
});
