import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils';

const INDEX_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.8.1',
  'x-restate-features':
    'vqueues,protocol_v7,scoped_virtual_objects,indexes_v1,track_status_gauges',
};

const DEPLOYMENT_FILTER = {
  field: 'deployment',
  type: 'STRING_LIST',
  operation: 'IN',
  value: ['dp_1'],
};

const ROWS = [
  ['A', 'inbox', 'scheduled', 2],
  ['A', 'inbox', 'backing-off', 1],
  ['A', 'running', 'started', 3],
  ['A', 'finished', 'succeeded', 7],
  ['A', 'finished', 'failed', 3],
  ['B', 'suspended', 'suspended', 4],
].map(([service_name, stage, status, num_entries]) => ({
  deployment_id: 'dp_1',
  service_name,
  stage,
  status,
  num_entries,
}));

type SummaryResponse = {
  mode: string;
  total: number;
  stageBuckets: {
    key: string;
    count: number;
    breakdownCoverage: string;
    breakdownCanRefine: boolean;
  }[];
  statusBuckets: { key: string; count: number }[];
};

function countsByKey(buckets: { key: string; count: number }[]) {
  return Object.fromEntries(buckets.map(({ key, count }) => [key, count]));
}

describe('invocation summary from sys_deployment_stats', () => {
  const harness = createInvocationV2QueryTestHarness();

  it('builds full stage and status buckets for a deployment', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_deployment_stats') ? ROWS : [],
    );

    const response = await harness.post(
      '/v2/invocations/summary',
      { view: 'stages', filters: [DEPLOYMENT_FILTER] },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as SummaryResponse;

    expect(body.mode).toBe('exact');
    expect(body.total).toBe(20);
    expect(
      Object.fromEntries(
        body.stageBuckets.map(
          ({ key, count, breakdownCoverage, breakdownCanRefine }) => [
            key,
            [count, breakdownCoverage, breakdownCanRefine],
          ],
        ),
      ),
    ).toEqual({
      inbox: [3, 'full', false],
      running: [3, 'full', false],
      suspended: [4, 'full', false],
      paused: [0, 'full', false],
      finished: [10, 'full', false],
    });
    expect(countsByKey(body.statusBuckets)).toMatchObject({
      scheduled: 2,
      'backing-off': 1,
      running: 3,
      suspended: 4,
      succeeded: 7,
      failed: 3,
    });
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT deployment_id, service_name, stage, status, num_entries
      FROM sys_deployment_stats
      WHERE deployment_id IN ('dp_1')",
      ]
    `);
  });

  it('counts a deployment for the count view', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_deployment_stats') ? ROWS : [],
    );

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'count',
        filters: [
          DEPLOYMENT_FILTER,
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'suspended'],
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(((await response.json()) as SummaryResponse).total).toBe(7);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT deployment_id, service_name, stage, status, num_entries
      FROM sys_deployment_stats
      WHERE deployment_id IN ('dp_1')",
      ]
    `);
  });

  it('filters by a status that covers part of a stage', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_deployment_stats') ? ROWS : [],
    );

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'count',
        filters: [
          DEPLOYMENT_FILTER,
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['backing-off'],
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(((await response.json()) as SummaryResponse).total).toBe(1);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT deployment_id, service_name, stage, status, num_entries
      FROM sys_deployment_stats
      WHERE deployment_id IN ('dp_1')",
      ]
    `);
  });

  it('groups unfinished entries by deployment for the deployments view', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_deployment_stats')
        ? [
            ...ROWS,
            {
              deployment_id: 'dp_2',
              service_name: 'C',
              stage: 'running',
              status: 'started',
              num_entries: 2,
            },
          ]
        : [],
    );

    const response = await harness.post(
      '/v2/invocations/summary',
      {
        view: 'deployments',
        filters: [
          {
            field: 'stage',
            type: 'STRING_LIST',
            operation: 'NOT_IN',
            value: ['finished'],
          },
        ],
      },
      INDEX_HEADERS,
    );
    const body = (await response.json()) as {
      total: number;
      deploymentBuckets: {
        deployment: string;
        count: number;
        statusBuckets: { key: string; count: number }[];
      }[];
    };

    expect(body.total).toBe(12);
    expect(
      body.deploymentBuckets.map(({ deployment, count, statusBuckets }) => ({
        deployment,
        count,
        stages: countsByKey(statusBuckets),
      })),
    ).toEqual([
      {
        deployment: 'dp_1',
        count: 10,
        stages: { inbox: 3, running: 3, suspended: 4, paused: 0, finished: 0 },
      },
      {
        deployment: 'dp_2',
        count: 2,
        stages: { inbox: 0, running: 2, suspended: 0, paused: 0, finished: 0 },
      },
    ]);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT deployment_id, service_name, stage, status, num_entries
      FROM sys_deployment_stats",
      ]
    `);
  });

  it('rejects the deployments view without stats', async () => {
    harness.setResponder(() => []);

    const response = await harness.post(
      '/v2/invocations/summary',
      { view: 'deployments' },
      { ...INDEX_HEADERS, 'x-restate-features': 'vqueues,protocol_v7' },
    );

    expect(response.status).toBe(400);
    expect(harness.sql).toEqual([]);
  });

  it('falls back without the stats feature on the server', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations/summary',
      { view: 'count', filters: [DEPLOYMENT_FILTER] },
      {
        ...INDEX_HEADERS,
        'x-restate-features': 'vqueues,protocol_v7,indexes_v1',
      },
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              COUNT(1) AS count
            FROM sys_vqueues v
            WHERE v.deployment IN ('dp_1')",
      ]
    `);
  });
});
