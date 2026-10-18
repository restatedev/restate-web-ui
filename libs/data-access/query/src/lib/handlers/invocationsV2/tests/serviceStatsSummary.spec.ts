import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils.js';

const INDEX_HEADERS = {
  'content-type': 'application/json',
  'x-restate-features': 'indexes_v1,track_status_gauges',
};

const STATS_ROWS = [
  ['Greeter', 'greet', 'inbox', 'scheduled', 2],
  ['Greeter', 'greet', 'inbox', 'backing-off', 3],
  ['Greeter', 'greet', 'running', 'started', 1],
  ['Greeter', 'greet', 'finished', 'succeeded', 10],
  ['Greeter', 'greet', 'finished', 'failed', 4],
  ['Counter', 'add', 'inbox', 'new', 5],
  ['Counter', 'add', 'suspended', 'suspended', 6],
  ['Counter', 'get', 'paused', 'started', 7],
].map(([service_name, handler, stage, status, num_entries]) => ({
  service_name,
  handler,
  kind: 'invocation',
  stage,
  status,
  num_entries,
}));

const STATE_MUTATION_ROW = {
  service_name: 'Counter',
  handler: null,
  kind: 'state-mutation',
  stage: 'inbox',
  status: 'new',
  num_entries: 100,
};

type SummaryResponse = {
  mode: string;
  isPartial: boolean;
  total: number;
  stageBuckets: {
    key: string;
    count: number;
    breakdownCoverage: string;
    breakdownCanRefine: boolean;
  }[];
  statusBuckets: { key: string; count: number }[];
  serviceBuckets: {
    service: string;
    count: number;
    statusBuckets: { key: string; count: number }[];
    statusBreakdown?: { key: string; count: number }[];
    handlerBuckets?: {
      handler: string;
      count: number;
      statusBuckets: { key: string; count: number }[];
    }[];
  }[];
};

function countsByKey(buckets: { key: string; count: number }[]) {
  return Object.fromEntries(buckets.map(({ key, count }) => [key, count]));
}

describe('invocation summary from sys_service_stats', () => {
  const harness = createInvocationV2QueryTestHarness();

  type StatsRow = (typeof STATS_ROWS)[number] | typeof STATE_MUTATION_ROW;

  function respondWithStats(where: (row: StatsRow) => boolean = () => true) {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_service_stats')
        ? [...STATS_ROWS, STATE_MUTATION_ROW].filter(where)
        : [],
    );
  }

  it('builds every bucket from one exact stats query', async () => {
    respondWithStats();

    const response = await harness.post(
      '/v2/invocations/summary',
      { mode: { type: 'sampled', sampleSize: 1000 }, view: 'all' },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.mode).toBe('exact');
    expect(body.isPartial).toBe(false);
    expect(body.total).toBe(138);
    expect(countsByKey(body.stageBuckets)).toEqual({
      inbox: 110,
      running: 1,
      suspended: 6,
      paused: 7,
      finished: 14,
    });
    expect(
      body.stageBuckets.every(
        ({ breakdownCoverage, breakdownCanRefine }) =>
          breakdownCoverage === 'full' && !breakdownCanRefine,
      ),
    ).toBe(true);
    expect(countsByKey(body.statusBuckets)).toMatchObject({
      pending: 105,
      scheduled: 2,
      'backing-off': 3,
      running: 1,
      suspended: 6,
      paused: 7,
      succeeded: 10,
      failed: 4,
    });
    expect(
      body.serviceBuckets.map(({ service, handlerBuckets }) => ({
        service,
        handlers: Object.fromEntries(
          (handlerBuckets ?? []).map(({ handler, count, statusBuckets }) => [
            handler,
            [count, countsByKey(statusBuckets)],
          ]),
        ),
      })),
    ).toEqual([
      {
        service: 'Counter',
        handlers: {
          add: [
            11,
            { inbox: 5, running: 0, suspended: 6, paused: 0, finished: 0 },
          ],
          get: [
            7,
            { inbox: 0, running: 0, suspended: 0, paused: 7, finished: 0 },
          ],
        },
      },
      {
        service: 'Greeter',
        handlers: {
          greet: [
            20,
            { inbox: 5, running: 1, suspended: 0, paused: 0, finished: 14 },
          ],
        },
      },
    ]);
    expect(
      Object.fromEntries(
        body.serviceBuckets.map(({ service, statusBreakdown }) => [
          service,
          countsByKey(statusBreakdown ?? []),
        ]),
      ),
    ).toMatchObject({
      Counter: { pending: 105, suspended: 6, paused: 7, succeeded: 0 },
      Greeter: {
        pending: 0,
        scheduled: 2,
        'backing-off': 3,
        running: 1,
        succeeded: 10,
        failed: 4,
      },
    });
    expect(
      body.serviceBuckets.map(({ service, count, statusBuckets }) => ({
        service,
        count,
        stages: countsByKey(statusBuckets),
      })),
    ).toEqual(
      [
        {
          service: 'Counter',
          count: 118,
          stages: {
            inbox: 105,
            running: 0,
            suspended: 6,
            paused: 7,
            finished: 0,
          },
        },
        {
          service: 'Greeter',
          count: 20,
          stages: {
            inbox: 5,
            running: 1,
            suspended: 0,
            paused: 0,
            finished: 14,
          },
        },
      ].sort((left, right) => right.count - left.count),
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, handler, kind, stage, status, num_entries
      FROM sys_service_stats",
      ]
    `);
  });

  it('applies service, handler and status filters', async () => {
    respondWithStats(
      ({ service_name, handler }) =>
        ['Greeter', 'Counter'].includes(service_name as string) &&
        handler !== null &&
        handler !== 'get',
    );

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'all',
        filters: [
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['Greeter', 'Counter'],
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'NOT_EQUALS',
            value: 'get',
          },
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'NOT_IN',
            value: ['succeeded'],
          },
        ],
      },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.total).toBe(21);
    expect(countsByKey(body.stageBuckets)).toMatchObject({
      paused: 0,
      finished: 4,
    });

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, handler, kind, stage, status, num_entries
      FROM sys_service_stats
      WHERE service_name IN ('Greeter', 'Counter')
        AND handler != 'get'",
      ]
    `);
  });

  it('keeps SQL wildcard semantics for service filters', async () => {
    respondWithStats();

    await harness.post(
      '/v2/invocations/summary',
      {
        view: 'count',
        filters: [
          {
            field: 'target_service_name',
            type: 'STRING',
            operation: 'CONTAINS',
            value: 'Stateful_',
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'NOT_CONTAINS',
            value: '%',
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, handler, kind, stage, status, num_entries
      FROM sys_service_stats
      WHERE service_name LIKE '%Stateful_%'
        AND handler NOT LIKE '%%%'",
      ]
    `);
  });

  it('omits the completed stage for live-stages', async () => {
    respondWithStats();

    const response = await harness.post(
      '/v2/invocations/summary',
      { view: 'live-stages' },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.stageBuckets.map(({ key }) => key)).not.toContain('finished');
    expect(body.total).toBe(124);
  });

  it('counts from stats for the count view', async () => {
    respondWithStats(({ service_name }) => service_name === 'Greeter');

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'count',
        filters: [
          {
            field: 'target_service_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'Greeter',
          },
        ],
      },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.total).toBe(20);
    expect(body.mode).toBe('exact');

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, handler, kind, stage, status, num_entries
      FROM sys_service_stats
      WHERE service_name = 'Greeter'",
      ]
    `);
  });

  it('falls back when a filter is not available in stats', async () => {
    respondWithStats();

    await harness.post(
      '/v2/invocations/summary',
      {
        view: 'all',
        filters: [
          {
            field: 'target_service_key',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'k',
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              ss.target_service_name AS service_name,
              CASE
                WHEN ss.status = 'inboxed' THEN 'pending'
                WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                WHEN ss.status = 'completed' THEN 'failed'
                ELSE ss.status
              END AS bucket,
              COUNT(1) AS count
            FROM sys_invocation_status ss
            LEFT JOIN sys_invocation_state sis ON sis.id = ss.id
            WHERE ss.target_service_key = 'k'
            GROUP BY
              ss.target_service_name,
              CASE
                WHEN ss.status = 'inboxed' THEN 'pending'
                WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                WHEN ss.status = 'completed' THEN 'failed'
                ELSE ss.status
              END",
      ]
    `);
  });

  it('falls back without the stats server feature', async () => {
    respondWithStats();

    await harness.post('/v2/invocations/summary', { view: 'all' });

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              vm.service_name,
              SUM(vm.num_inbox) AS inbox,
              SUM(vm.num_running) AS running,
              SUM(vm.num_suspended) AS suspended,
              SUM(vm.num_paused) AS paused,
              SUM(vm.num_finished) AS finished
            FROM sys_vqueue_meta vm
            WHERE vm.num_inbox > 0
              OR vm.num_running > 0
              OR vm.num_suspended > 0
              OR vm.num_paused > 0
              OR vm.num_finished > 0
            GROUP BY vm.service_name",
        "SELECT
              v.status,
              COUNT(1) AS count
            FROM sys_vqueues v
            WHERE v.stage = 'inbox'
            GROUP BY v.status",
        "SELECT
              v.status,
              COUNT(1) AS count
            FROM sys_vqueues v
            WHERE v.stage = 'finished'
            GROUP BY v.status",
      ]
    `);
  });

  it('serves the inbox status breakdown from stats', async () => {
    respondWithStats(({ service_name }) => service_name === 'Greeter');

    const response = await harness.post(
      '/v2/invocations/inbox',
      { groupBy: 'status', serviceNames: ['Greeter'] },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as {
      total: number;
      isPartial: boolean;
      byStatus: { status: string; count: number }[];
    };

    expect(body.total).toBe(5);
    expect(body.isPartial).toBe(false);
    expect(body.byStatus).toEqual(
      expect.arrayContaining([
        { status: 'scheduled', count: 2 },
        { status: 'backing-off', count: 3 },
      ]),
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT service_name, handler, kind, stage, status, num_entries
      FROM sys_service_stats
      WHERE service_name = 'Greeter'",
      ]
    `);
  });
});
