import type {
  RawInvocation,
  Service,
} from '@restate/data-access/admin-api-spec';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { query as queryRouter } from '../query';
import type { QueryContext } from './shared';
import {
  getWorkflowRun,
  getWorkflowRunStats,
  listWorkflowRuns,
} from './workflows';

const workflowService = {
  name: 'OrderWorkflow',
  ty: 'Workflow',
  handlers: [
    { name: 'run', ty: 'Workflow' },
    { name: 'approve', ty: 'Shared' },
    { name: 'status', ty: 'Shared' },
  ],
} as Service;

function invocation(
  id: string,
  handler: string,
  overrides: Partial<RawInvocation> = {},
): RawInvocation {
  return {
    id,
    target: `OrderWorkflow/order-1/${handler}`,
    target_service_name: 'OrderWorkflow',
    target_service_key: 'order-1',
    target_handler_name: handler,
    target_service_ty: 'workflow',
    status: 'ready',
    invoked_by: 'ingress',
    created_at: '2026-07-29T10:00:00.000Z',
    modified_at: '2026-07-29T10:00:00.000Z',
    scheduled_at: '2026-07-29T10:00:00.000Z',
    ...overrides,
  };
}

function createContext(
  responder: (sql: string) => Record<string, unknown>[],
  features = new Set(['vqueues']),
  restateVersion = '1.7.3',
) {
  const query = vi.fn(async (sql: string) => ({ rows: responder(sql) }));
  const adminApiOwner: Pick<QueryContext, 'adminApi'> = {
    adminApi: async <T>() => workflowService as T,
  };
  const adminApi = vi.spyOn(adminApiOwner, 'adminApi');
  const context: QueryContext = {
    query,
    adminApi: adminApiOwner.adminApi,
    features,
    baseUrl: '',
    restateVersion,
  };
  return { adminApi, context, query };
}

describe('Workflow query handlers', () => {
  afterEach(() => vi.useRealTimers());

  it('uses an exact Workflow id predicate', async () => {
    const { context, query } = createContext(() => []);

    const response = await listWorkflowRuns.call(context, 'OrderWorkflow', {
      filters: [
        {
          field: 'id',
          type: 'STRING',
          operation: 'EQUALS',
          value: "Order's",
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = 'OrderWorkflow'
      AND target_service_ty = 'workflow'
      AND target_handler_name = 'run'
      AND target_service_key = 'Order''s'
    ORDER BY created_at DESC NULLS LAST
    LIMIT 51`,
    ]);
  });

  it('applies structured Workflow id and scope filters', async () => {
    const { context, query } = createContext(() => []);

    const response = await listWorkflowRuns.call(context, 'OrderWorkflow', {
      filters: [
        {
          field: 'id',
          type: 'STRING',
          operation: 'CONTAINS',
          value: "Order's",
        },
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Tenant-A',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT id
    FROM sys_invocation_status
    WHERE target_service_name = 'OrderWorkflow'
      AND target_service_ty = 'workflow'
      AND target_handler_name = 'run'
      AND target_service_key ILIKE '%Order''s%'
      AND scope = 'Tenant-A'
    ORDER BY created_at DESC NULLS LAST
    LIMIT 51`,
    ]);
  });

  it('rejects Workflow scope filters without VQueues', async () => {
    const { context, query } = createContext(() => [], new Set());

    const response = await listWorkflowRuns.call(context, 'OrderWorkflow', {
      filters: [
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'tenant-a',
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Unsupported filter field: scope');
    expect(query).not.toHaveBeenCalled();
  });

  it('lists only Workflow handler runs and overlays VQueue status', async () => {
    const { adminApi, context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return [{ id: 'inv_run-1' }, { id: 'inv_run-2' }];
      }
      if (sql.includes('FROM sys_invocation\n')) {
        return [
          invocation('inv_run-1', 'run', {
            scope: 'tenant-a',
            status: 'pending',
            vqueue_id: 'vq_stored-run-1',
            limit_key: 'priority/customer',
          }),
          invocation('inv_run-2', 'run', {
            target_service_key: 'order-2',
            status: 'completed',
            completion_result: 'success',
            completed_at: '2026-07-29T10:05:00.000Z',
          }),
        ];
      }
      return [
        {
          entry_id: 'inv_run-1',
          vqueue_id: 'vq_run-1',
          stage: 'running',
          status: 'started',
          created_at: '2026-07-29T10:00:00.000Z',
          first_runnable_at: '2026-07-29T10:00:00.000Z',
        },
      ];
    });

    const response = await listWorkflowRuns.call(context, 'OrderWorkflow', {
      search: "order%_\\'",
    });

    expect(adminApi).toHaveBeenCalledWith('/services/OrderWorkflow');
    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_handler_name = 'run'
            AND target_service_key IS NOT NULL
            AND (target_service_key LIKE '%order\\%\\_\\\\''%' OR scope LIKE '%order\\%\\_\\\\''%')
          ORDER BY created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_run-1', 'inv_run-2')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_run-1', 'inv_run-2') AND entry_kind = 'invocation'",
      ]
    `);
    expect(await response.json()).toMatchObject({
      limit: 50,
      truncated: false,
      rows: [
        {
          id: 'order-1',
          scope: 'tenant-a',
          runInvocation: {
            id: 'inv_run-1',
            status: 'running',
            vqueue_id: 'vq_stored-run-1',
            limit_key: 'priority/customer',
            vqueue: {
              vqueue_id: 'vq_run-1',
              stage: 'running',
              status: 'started',
            },
          },
        },
        {
          id: 'order-2',
          runInvocation: { id: 'inv_run-2', status: 'succeeded' },
        },
      ],
    });
  });

  it('uses direct key equality without VQueues before Restate 1.7.3', async () => {
    const { context, query } = createContext(
      (sql) => {
        if (
          sql.includes('FROM sys_invocation_status') &&
          sql.includes("target_handler_name = 'run'")
        ) {
          return [{ id: 'inv_run' }];
        }
        if (sql.includes('FROM sys_invocation_status')) {
          return [
            { id: 'inv_shared-2' },
            { id: 'inv_run' },
            { id: 'inv_shared-1' },
          ];
        }
        return [
          invocation('inv_shared-1', 'approve'),
          invocation('inv_run', 'run'),
          invocation('inv_shared-2', 'status'),
        ];
      },
      new Set(),
      '1.7.2',
    );

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_service_key = 'order-1'
            AND target_handler_name = 'run'
          LIMIT 1",
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_service_key = 'order-1'
          ORDER BY created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
          FROM sys_invocation
          WHERE id IN ('inv_run', 'inv_shared-2', 'inv_shared-1')",
      ]
    `);
    expect(await response.json()).toMatchObject({
      runInvocation: { id: 'inv_run' },
      recentInvocations: [
        { id: 'inv_shared-2' },
        { id: 'inv_run' },
        { id: 'inv_shared-1' },
      ],
      recentInvocationsLimit: 50,
      recentInvocationsTruncated: false,
    });
  });

  it('uses direct key equality for a scoped run on Restate 1.7.3', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return sql.includes("target_handler_name = 'run'")
          ? [{ id: 'inv_run' }]
          : [];
      }
      if (sql.includes('FROM sys_invocation\n')) {
        return [
          invocation('inv_run', 'run', {
            scope: 'tenant-a',
            status: 'completed',
            completion_result: 'success',
            completed_at: '2026-07-29T10:05:00.000Z',
          }),
        ];
      }
      return [];
    });

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
      'tenant-a',
    );

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_service_key = 'order-1'
            AND target_handler_name = 'run'
            AND scope = 'tenant-a'
          LIMIT 1",
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_service_key = 'order-1'
            AND scope = 'tenant-a'
          ORDER BY created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_run')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_run') AND entry_kind = 'invocation'",
      ]
    `);
    expect(await response.json()).toMatchObject({
      runInvocation: {
        id: 'inv_run',
        status: 'succeeded',
        scope: 'tenant-a',
      },
    });
  });

  it('uses the key workaround with VQueues before Restate 1.7.3', async () => {
    const { context, query } = createContext(
      (sql) => {
        if (sql.includes('FROM sys_invocation_status')) {
          return sql.includes("target_handler_name = 'run'")
            ? [{ id: 'inv_run' }]
            : [];
        }
        if (sql.includes('FROM sys_invocation\n')) {
          return [invocation('inv_run', 'run')];
        }
        return [];
      },
      new Set(['vqueues']),
      '1.7.2',
    );

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND target_handler_name = 'run'
            AND scope IS NULL
          LIMIT 1",
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND scope IS NULL
          ORDER BY created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_run')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_run') AND entry_kind = 'invocation'",
      ]
    `);
  });

  it('rejects a scoped identity on a legacy server without querying', async () => {
    const { adminApi, context, query } = createContext(() => [], new Set());

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
      'tenant-a',
    );

    expect(response.status).toBe(400);
    expect(adminApi).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('loads retained interactions when the run invocation is unavailable', async () => {
    const { context } = createContext((sql) => {
      if (
        sql.includes('FROM sys_invocation_status') &&
        sql.includes("target_handler_name = 'run'")
      ) {
        return [];
      }
      if (sql.includes('FROM sys_invocation_status')) {
        return [{ id: 'inv_shared' }];
      }
      if (sql.includes('FROM sys_invocation\n')) {
        return [invocation('inv_shared', 'approve')];
      }
      return [];
    }, new Set());

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('runInvocation');
    expect(body).toMatchObject({
      recentInvocations: [{ id: 'inv_shared' }],
      recentInvocationsLimit: 50,
      recentInvocationsTruncated: false,
    });
  });

  it('returns not found when the Workflow has no retained invocations', async () => {
    const { context } = createContext(() => [], new Set());

    const response = await getWorkflowRun.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(response.status).toBe(404);
  });

  it('returns statistics for a scoped run', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            stage: 'finished',
            transitioned_at: '2026-07-31T16:00:00.000Z',
            first_attempt_at: '2026-07-31T14:00:00.000Z',
            first_runnable_at: '2026-07-31T13:59:56.500Z',
          },
        ];
      }
      if (sql.includes('FROM sys_promise')) {
        return [{ pending_promise_count: 2 }];
      }
      if (sql.includes('FROM state')) {
        return [{ num_keys: 4, total_size: 2048 }];
      }
      return [
        {
          last_interaction_at: '2026-07-31T14:00:00.000Z',
        },
      ];
    });

    const response = await getWorkflowRunStats.call(
      context,
      'OrderWorkflow',
      'order-1',
      'tenant-a',
      'inv_run',
    );

    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT
            stage,
            transitioned_at,
            first_attempt_at,
            first_runnable_at
          FROM sys_vqueue_entry_status
          WHERE entry_id = 'inv_run'
            AND entry_kind = 'invocation'
          LIMIT 1",
        "SELECT COUNT(*) AS pending_promise_count
          FROM sys_promise
          WHERE service_name = 'OrderWorkflow'
            AND service_key = 'order-1'
            AND scope = 'tenant-a'
            AND completed = false",
        "SELECT MAX(si.created_at) AS last_interaction_at
          FROM sys_invocation_status si
          WHERE si.target_service_name = 'OrderWorkflow'
            AND si.target_service_ty = 'workflow'
            AND si.target_service_key = 'order-1'
            AND si.target_handler_name <> 'run'
            AND si.scope = 'tenant-a'",
        "SELECT
            COUNT(*) AS num_keys,
            COALESCE(SUM(value_length), 0) AS total_size
          FROM state
          WHERE service_name = 'OrderWorkflow'
            AND service_key = 'order-1'
            AND scope = 'tenant-a'",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      duration: 'PT7200S',
      queueDuration: 'PT3.5S',
      pendingPromiseCount: 2,
      lastInteractionAt: '2026-07-31T14:00:00.000Z',
      state: { numKeys: 4, totalSize: 2048 },
    });
  });

  it('returns statistics for an unscoped run without interactions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T14:00:30.000Z'));
    const { context, query } = createContext((sql) => {
      if (
        sql.includes('SELECT id\n') &&
        sql.includes("target_handler_name = 'run'")
      ) {
        return [{ id: 'inv_run' }];
      }
      if (sql.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            stage: 'inbox',
            transitioned_at: '2026-07-31T13:59:55.000Z',
            first_attempt_at: null,
            first_runnable_at: '2026-07-31T14:00:00.000Z',
          },
        ];
      }
      if (sql.includes('FROM sys_promise')) {
        return [{ pending_promise_count: 0 }];
      }
      if (sql.includes('FROM state')) {
        return [{ num_keys: 0, total_size: 0 }];
      }
      return [{ last_interaction_at: null }];
    });

    const response = await getWorkflowRunStats.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(query.mock.calls.map(([sql]) => sql)).toMatchInlineSnapshot(`
      [
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND target_service_key = 'order-1'
            AND target_handler_name = 'run'
            AND scope IS NULL
          LIMIT 1",
        "SELECT
            stage,
            transitioned_at,
            first_attempt_at,
            first_runnable_at
          FROM sys_vqueue_entry_status
          WHERE entry_id = 'inv_run'
            AND entry_kind = 'invocation'
          LIMIT 1",
        "SELECT COUNT(*) AS pending_promise_count
          FROM sys_promise
          WHERE service_name = 'OrderWorkflow'
            AND service_key = 'order-1'
            AND scope IS NULL
            AND completed = false",
        "SELECT MAX(si.created_at) AS last_interaction_at
          FROM sys_invocation_status si
          WHERE si.target_service_name = 'OrderWorkflow'
            AND si.target_service_ty = 'workflow'
            AND si.target_service_key = 'order-1'
            AND si.target_handler_name <> 'run'
            AND si.scope IS NULL",
        "SELECT
            COUNT(*) AS num_keys,
            COALESCE(SUM(value_length), 0) AS total_size
          FROM state
          WHERE service_name = 'OrderWorkflow'
            AND service_key = 'order-1'
            AND scope IS NULL",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      waitingToStartDuration: 'PT30S',
      pendingPromiseCount: 0,
      state: { numKeys: 0, totalSize: 0 },
    });
  });

  it('returns not found statistics when the run does not exist', async () => {
    const { context, query } = createContext(() => []);

    const response = await getWorkflowRunStats.call(
      context,
      'OrderWorkflow',
      'missing',
    );

    expect(response.status).toBe(404);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports Workflow statistics as unsupported without Virtual Queues', async () => {
    const { adminApi, context, query } = createContext(() => [], new Set());

    const response = await getWorkflowRunStats.call(
      context,
      'OrderWorkflow',
      'order-1',
    );

    expect(await response.json()).toEqual({ supported: false });
    expect(adminApi).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('routes the Workflow statistics endpoint', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');

    const response = await queryRouter(
      new Request(
        'http://query.test/query/workflows/OrderWorkflow/runs/order-1/stats',
        {
          headers: {
            'x-restate-version': '1.7.2',
            'x-restate-features': 'protocol_v7',
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ supported: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
