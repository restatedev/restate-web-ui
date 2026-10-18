import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils.js';

const INDEX_HEADERS = {
  'content-type': 'application/json',
  'x-restate-features': 'indexes_v1',
  'x-restate-ui-features': 'indexes_v1',
};
const SORT = { field: 'transitioned_at', order: 'DESC' };
const service = (value: string) => ({
  field: 'target_service_name',
  type: 'STRING',
  operation: 'EQUALS',
  value,
});
const statuses = (value: string[]) => ({
  field: 'status',
  type: 'STRING_LIST',
  operation: 'IN',
  value,
});
const objectKey = {
  field: 'target_service_key',
  type: 'STRING',
  operation: 'EQUALS',
  value: 'k',
};

describe('invocation list from entry indexes', () => {
  const harness = createInvocationV2QueryTestHarness();

  it('lists all stages from the stage index', async () => {
    harness.setResponder(() => []);

    await harness.post('/v2/invocations', { sort: SORT }, INDEX_HEADERS);

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_stage
      ORDER BY transitioned_at DESC
      LIMIT 250",
      ]
    `);
  });

  it('returns state mutations as entries without loading invocation details', async () => {
    harness.setResponder((sql) => {
      if (sql.includes('FROM _idx_entry_by_stage')) {
        return [{ entry_id: 'inv_1' }, { entry_id: 'mut_1' }];
      }
      if (sql.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            entry_id: 'inv_1',
            entry_kind: 'invocation',
            vqueue_id: 'vq_1',
            stage: 'running',
            status: 'started',
          },
          {
            entry_id: 'mut_1',
            entry_kind: 'state-mutation',
            vqueue_id: 'vq_1',
            stage: 'inbox',
            status: 'new',
            created_at: '2026-10-13T10:00:00.000Z',
          },
        ];
      }
      if (sql.includes('FROM sys_invocation i')) {
        return [
          {
            id: 'inv_1',
            target: 'Counter/k/add',
            target_service_name: 'Counter',
            target_handler_name: 'add',
            target_service_ty: 'virtual_object',
            status: 'invoked',
            created_at: '2026-10-13T09:00:00.000Z',
            modified_at: '2026-10-13T09:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const response = await harness.post('/v2/invocations', {}, INDEX_HEADERS);
    const body = (await response.json()) as {
      rows: { id: string; kind?: string }[];
    };

    expect(
      body.rows.map(({ id, kind }) => ({ id, ...(kind && { kind }) })),
    ).toEqual([{ id: 'inv_1' }, { id: 'mut_1', kind: 'state-mutation' }]);
    expect(body.rows[1]).toEqual({
      id: 'mut_1',
      kind: 'state-mutation',
      vqueueId: 'vq_1',
      stage: 'inbox',
      status: 'new',
      createdAt: '2026-10-13T10:00:00.000Z',
    });
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_stage
      LIMIT 250",
        "SELECT
              id,
      target,
      target_service_name,
      target_service_key,
      target_handler_name,
      target_service_ty,
      idempotency_key,
      invoked_by,
      invoked_by_id,
      invoked_by_subscription_id,
      invoked_by_target,
      restarted_from,
      pinned_deployment_id,
      pinned_service_protocol_version,
      journal_size,
      journal_commands_size,
      created_at,
      modified_at,
      inboxed_at,
      scheduled_at,
      scheduled_start_at,
      running_at,
      completed_at,
      completion_retention,
      journal_retention,
      retry_count,
      last_start_at,
      next_retry_at,
      last_attempt_deployment_id,
      last_attempt_server,
      last_failure,
      last_failure_error_code,
      status,
      completion_result,
      completion_failure,
      last_awaiting_on_future_json,
      suspended_waiting_for_completions,
      suspended_waiting_for_signals,
      suspended_waiting_future_json,
      scope,
      vqueue_id,
      limit_key
            FROM sys_invocation i
            WHERE i.id IN ('inv_1')",
        "SELECT
              v.entry_id,
              v.entry_kind,
              v.vqueue_id,
              v.stage,
              v.status,
              v.next_at,
              v.created_at,
              v.transitioned_at,
              v.first_attempt_at,
              v.latest_attempt_at,
              v.first_runnable_at,
              v.retry_attempts,
              v.retry_count_since_last_stored_command,
              v.num_attempts,
              v.num_errors,
              v.deployment
            FROM sys_vqueue_entry_status v
            WHERE v.entry_id IN ('inv_1', 'mut_1')",
      ]
    `);
  });

  it('leaves state mutations out when a filter only exists on invocations', async () => {
    harness.setResponder((sql) => {
      if (sql.includes(' AS id')) return [{ id: 'mut_1' }];
      if (sql.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            entry_id: 'mut_1',
            entry_kind: 'state-mutation',
            stage: 'inbox',
            status: 'new',
          },
        ];
      }
      return [];
    });

    const response = await harness.post(
      '/v2/invocations',
      {
        sort: { field: 'created_at', order: 'DESC' },
        filters: [
          service('Counter'),
          {
            field: 'target_handler_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['add'],
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(((await response.json()) as { rows: unknown[] }).rows).toEqual([]);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              ss.id AS id
            FROM sys_invocation_status ss
            WHERE ss.target_service_name = 'Counter'
              AND ss.target_handler_name IN ('add')
            ORDER BY ss.created_at DESC NULLS LAST
            LIMIT 250",
        "SELECT
              v.entry_id,
              v.entry_kind,
              v.vqueue_id,
              v.stage,
              v.status,
              v.next_at,
              v.created_at,
              v.transitioned_at,
              v.first_attempt_at,
              v.latest_attempt_at,
              v.first_runnable_at,
              v.retry_attempts,
              v.retry_count_since_last_stored_command,
              v.num_attempts,
              v.num_errors,
              v.deployment
            FROM sys_vqueue_entry_status v
            WHERE v.entry_id IN ('mut_1')",
      ]
    `);
  });

  it('pins whole stages selected by the status filter', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations',
      { sort: SORT, filters: [statuses(['running', 'paused'])] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_stage
      WHERE stage IN ('running', 'paused')
      ORDER BY transitioned_at DESC
      LIMIT 250",
      ]
    `);
  });

  it('uses the service index for a service filter', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations',
      { sort: SORT, filters: [service('Greeter')] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_service
      WHERE service_name = 'Greeter'
      ORDER BY transitioned_at DESC
      LIMIT 250",
      ]
    `);
  });

  it('uses the virtual object index for a virtual object key', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_service') ? [{ name: 'Counter' }] : [],
    );

    await harness.post(
      '/v2/invocations',
      { sort: SORT, filters: [service('Counter'), objectKey] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT name FROM sys_service WHERE ty = 'virtual_object' AND name IN ('Counter')",
        "SELECT entry_id
      FROM _idx_entry_by_virtual_object
      WHERE service_name = 'Counter'
        AND key = 'k'
      ORDER BY transitioned_at DESC
      LIMIT 250",
      ]
    `);
  });

  it('reverses the virtual object index order for an ascending sort', async () => {
    harness.setResponder((sql) =>
      sql.includes('FROM sys_service') ? [{ name: 'Counter' }] : [],
    );

    const response = await harness.post(
      '/v2/invocations',
      {
        sort: { field: 'transitioned_at', order: 'ASC' },
        filters: [service('Counter'), objectKey],
      },
      INDEX_HEADERS,
    );

    expect(response.status).toBe(200);
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT name FROM sys_service WHERE ty = 'virtual_object' AND name IN ('Counter')",
        "SELECT entry_id
      FROM _idx_entry_by_virtual_object
      WHERE service_name = 'Counter'
        AND key = 'k'
      ORDER BY transitioned_at ASC
      LIMIT 250",
      ]
    `);
  });

  it('falls back for workflow keys', async () => {
    harness.setResponder((sql) => (sql.includes('FROM sys_service') ? [] : []));

    await harness.post(
      '/v2/invocations',
      { sort: SORT, filters: [service('Flow'), objectKey] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT name FROM sys_service WHERE ty = 'virtual_object' AND name IN ('Flow')",
      ]
    `);
  });

  it('falls back when a status filter covers part of a stage', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations',
      { sort: SORT, filters: [statuses(['pending'])] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              v.entry_id AS id
            FROM sys_vqueues v
            WHERE v.stage = 'inbox'
              AND (v.stage = 'inbox' AND v.status IN ('new'))
            ORDER BY v.transitioned_at DESC NULLS LAST
            LIMIT 250",
      ]
    `);
  });

  it('uses the index without ORDER BY when no sort is requested', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations',
      { filters: [service('Greeter'), statuses(['running'])] },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_service
      WHERE stage = 'running'
        AND service_name = 'Greeter'
      LIMIT 250",
      ]
    `);
  });

  it('rejects transitioned_at when the filters cannot be served by it', async () => {
    harness.setResponder(() => []);

    const response = await harness.post(
      '/v2/invocations',
      {
        sort: SORT,
        filters: [
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'run',
          },
        ],
      },
      INDEX_HEADERS,
    );

    expect(response.status).toBe(400);

    expect(harness.sql).toMatchInlineSnapshot(`[]`);
  });

  it('falls back for created_at sorting', async () => {
    harness.setResponder(() => []);

    await harness.post(
      '/v2/invocations',
      { sort: { field: 'created_at', order: 'DESC' } },
      INDEX_HEADERS,
    );

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT
              v.entry_id AS id
            FROM sys_vqueues v
            ORDER BY v.created_at DESC NULLS LAST
            LIMIT 250",
      ]
    `);
  });

  it('counts a virtual object key from the index', async () => {
    harness.setResponder((sql) => {
      if (sql.includes('FROM sys_service')) return [{ name: 'Counter' }];
      if (sql.includes('COUNT(*) AS count')) return [{ count: 7 }];
      return [];
    });

    const response = await harness.post(
      '/v2/invocations/summary',
      { view: 'count', filters: [service('Counter'), objectKey] },
      INDEX_HEADERS,
    );

    expect(((await response.json()) as { total: number }).total).toBe(7);

    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "SELECT name FROM sys_service WHERE ty = 'virtual_object' AND name IN ('Counter')",
        "SELECT COUNT(*) AS count
      FROM _idx_entry_by_virtual_object
      WHERE service_name = 'Counter'
        AND key = 'k'",
      ]
    `);
  });
});
