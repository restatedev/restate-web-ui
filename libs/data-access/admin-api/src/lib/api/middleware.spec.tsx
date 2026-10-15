import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { setQueryClient } from '@restate/util/react-query';
import { setFeatureFlag } from '@restate/util/feature-flag';
import { client } from './client';
import './middleware';

describe('/query origin headers', () => {
  beforeEach(() => setQueryClient(new QueryClient()));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  async function sendQuery(headers?: Record<string, string>) {
    const fetch = vi.fn().mockResolvedValue(Response.json({ rows: [] }));
    vi.stubGlobal('fetch', fetch);
    await client.POST('/query', {
      baseUrl: 'https://restate.test',
      body: { query: 'SELECT 1' },
      headers,
    });
    return (fetch.mock.calls[0]?.[0] as Request).headers;
  }

  it('marks queries as built-in by default', async () => {
    const headers = await sendQuery();
    expect(headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(headers.get('X-Restate-Query-Origin')).toBe('built-in');
  });

  it('preserves an explicit origin', async () => {
    const headers = await sendQuery({ 'X-Restate-Query-Origin': 'user' });
    expect(headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(headers.get('X-Restate-Query-Origin')).toBe('user');
  });

  it('does not tag non-query requests', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    await client.GET('/version', { baseUrl: 'https://restate.test' });
    const headers = (fetch.mock.calls[0]?.[0] as Request).headers;
    expect(headers.has('X-Restate-Query-Client')).toBe(false);
    expect(headers.has('X-Restate-Query-Origin')).toBe(false);
  });

  it('omits the query level when the flag is off', async () => {
    const headers = await sendQuery();
    expect(headers.has('X-Restate-Query-Level')).toBe(false);
  });

  it('sends the operator query level when the flag is on', async () => {
    setFeatureFlag('FEATURE_OPERATOR_QUERY_LEVEL', true);
    const headers = await sendQuery();
    expect(headers.get('X-Restate-Query-Level')).toBe('operator');
  });

  it('passes the operator query level through the /query/* handler', async () => {
    setFeatureFlag('FEATURE_OPERATOR_QUERY_LEVEL', true);
    const fetch = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ version: '1.7.2', rows: [] }),
      );
    vi.stubGlobal('fetch', fetch);

    await client
      .GET('/query/invocations/{invocationId}/paused-error', {
        baseUrl: 'https://restate.test',
        params: { path: { invocationId: 'inv_1' } },
      })
      .catch(() => undefined);

    const sqlRequest = fetch.mock.calls
      .map(([request]) => request as Request)
      .find((request) => new URL(request.url).pathname === '/query');
    expect(sqlRequest?.headers.get('X-Restate-Query-Level')).toBe('operator');
  });

  it('does not tag other admin requests with the query level', async () => {
    setFeatureFlag('FEATURE_OPERATOR_QUERY_LEVEL', true);
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    await client.GET('/version', { baseUrl: 'https://restate.test' });
    const headers = (fetch.mock.calls[0]?.[0] as Request).headers;
    expect(headers.has('X-Restate-Query-Level')).toBe(false);
  });
});

describe('/query UI table flags', () => {
  beforeEach(() => setQueryClient(new QueryClient()));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  async function handlerSql(
    serverFeatures: Record<string, boolean>,
    send: () => Promise<unknown>,
  ) {
    const fetch = vi.fn(async (request: Request) =>
      new URL(request.url).pathname === '/version'
        ? Response.json({ version: '1.8.0', features: serverFeatures })
        : Response.json({ rows: [] }),
    );
    vi.stubGlobal('fetch', fetch);
    await send().catch(() => undefined);
    const statements = await Promise.all(
      fetch.mock.calls
        .map(([request]) => request)
        .filter((request) => new URL(request.url).pathname === '/query')
        .map(async (request) => {
          const body = (await request.clone().json()) as { query: string };
          return body.query;
        }),
    );
    return statements;
  }

  const drained = () =>
    client.GET('/query/deployments/drained', {
      baseUrl: 'https://restate.test',
    });
  const vqueues = () =>
    client.POST('/query/limits/vqueues', {
      baseUrl: 'https://restate.test',
      body: {},
    });

  it('uses stats tables whenever the server reports track_status_gauges', async () => {
    expect(await handlerSql({ track_status_gauges: true }, drained))
      .toMatchInlineSnapshot(`
      [
        "WITH active_deployments AS (
          SELECT deployment_id AS id
          FROM sys_service
          WHERE deployment_id IS NOT NULL

          UNION

          SELECT deployment_id AS id
          FROM sys_deployment_stats
          WHERE stage IN ('inbox', 'running', 'suspended', 'paused')
      )
      SELECT id
      FROM sys_deployment

      EXCEPT

      SELECT id
      FROM active_deployments",
      ]
    `);
    expect(await handlerSql({ track_status_gauges: true }, vqueues))
      .toMatchInlineSnapshot(`
      [
        "SELECT id, COUNT(*) AS workload
          FROM sys_vqueues
          WHERE stage IN ('inbox', 'running', 'suspended', 'paused')
          GROUP BY id
          ORDER BY workload DESC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) = 0
            AND (queue_is_paused = true
              OR GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) > now() - INTERVAL '24 hours')
          LIMIT 251",
      ]
    `);
  });

  it('uses index tables only when the index flag is on', async () => {
    localStorage.setItem('FEATURE_INDEXES_V1', 'true');
    expect(await handlerSql({ indexes_v1: true }, vqueues))
      .toMatchInlineSnapshot(`
      [
        "SELECT vqueue_id
      FROM _idx_busy_vqueue
      ORDER BY total_non_completed DESC, last_modified DESC
      LIMIT 251",
      ]
    `);
    expect(await handlerSql({ indexes_v1: true }, drained))
      .toMatchInlineSnapshot(`
        [
          "WITH active_deployments AS (
            SELECT deployment_id AS id
            FROM sys_service
            WHERE deployment_id IS NOT NULL

            UNION

            SELECT deployment AS id
            FROM sys_vqueues
            WHERE stage != 'finished'
              AND deployment IS NOT NULL
        )
        SELECT id
        FROM sys_deployment

        EXCEPT

        SELECT id
        FROM active_deployments",
        ]
      `);
  });

  it('uses VQueues when the server does not report track_status_gauges', async () => {
    expect(await handlerSql({ indexes_v1: true }, drained))
      .toMatchInlineSnapshot(`
      [
        "WITH active_deployments AS (
          SELECT deployment_id AS id
          FROM sys_service
          WHERE deployment_id IS NOT NULL

          UNION

          SELECT deployment AS id
          FROM sys_vqueues
          WHERE stage != 'finished'
            AND deployment IS NOT NULL
      )
      SELECT id
      FROM sys_deployment

      EXCEPT

      SELECT id
      FROM active_deployments",
      ]
    `);
  });

  it('ignores the index flag when the server supports neither feature', async () => {
    localStorage.setItem('FEATURE_INDEXES_V1', 'true');
    expect(await handlerSql({}, drained)).toMatchInlineSnapshot(`
      [
        "WITH active_deployments AS (
          SELECT deployment_id AS id
          FROM sys_service
          WHERE deployment_id IS NOT NULL

          UNION

          SELECT deployment AS id
          FROM sys_vqueues
          WHERE stage != 'finished'
            AND deployment IS NOT NULL
      )
      SELECT id
      FROM sys_deployment

      EXCEPT

      SELECT id
      FROM active_deployments",
      ]
    `);
    expect(await handlerSql({}, vqueues)).toMatchInlineSnapshot(`
      [
        "SELECT id, COUNT(*) AS workload
          FROM sys_vqueues
          WHERE stage IN ('inbox', 'running', 'suspended', 'paused')
          GROUP BY id
          ORDER BY workload DESC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) = 0
            AND (queue_is_paused = true
              OR GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) > now() - INTERVAL '24 hours')
          LIMIT 251",
      ]
    `);
  });
});
