import type {
  RawInvocation,
  Service,
} from '@restate/data-access/admin-api-spec';
import { describe, expect, it, vi } from 'vitest';
import type { QueryContext } from './shared';
import { getWorkflowRun, listWorkflowRuns } from './workflows';

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
    restateVersion: '1.7.3',
  };
  return { adminApi, context, query };
}

describe('Workflow query handlers', () => {
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

  it('loads one unscoped legacy run and its Shared invocations', async () => {
    const { context, query } = createContext((sql) => {
      if (
        sql.includes('FROM sys_invocation_status') &&
        sql.includes("target_handler_name = 'run'")
      ) {
        return [{ id: 'inv_run' }];
      }
      if (sql.includes('FROM sys_invocation_status')) {
        return [{ id: 'inv_shared-2' }, { id: 'inv_shared-1' }];
      }
      return [
        invocation('inv_shared-1', 'approve'),
        invocation('inv_run', 'run'),
        invocation('inv_shared-2', 'status'),
      ];
    }, new Set());

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
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND target_handler_name = 'run'
          LIMIT 1",
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND target_handler_name IN ('approve', 'status')
          ORDER BY created_at DESC NULLS LAST
          LIMIT 26",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
          FROM sys_invocation
          WHERE id IN ('inv_run', 'inv_shared-2', 'inv_shared-1')",
      ]
    `);
    expect(await response.json()).toMatchObject({
      runInvocation: { id: 'inv_run' },
      sharedInvocations: [{ id: 'inv_shared-2' }, { id: 'inv_shared-1' }],
      sharedInvocationsLimit: 25,
      sharedInvocationsTruncated: false,
    });
  });

  it('loads a completed scoped run and pins scope in both invocation queries', async () => {
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
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND target_handler_name = 'run'
            AND scope = 'tenant-a'
          LIMIT 1",
        "SELECT id
          FROM sys_invocation_status
          WHERE target_service_name = 'OrderWorkflow'
            AND target_service_ty = 'workflow'
            AND SUBSTR(target_service_key, 1) = 'order-1'
            AND target_handler_name IN ('approve', 'status')
            AND scope = 'tenant-a'
          ORDER BY created_at DESC NULLS LAST
          LIMIT 26",
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

  it('pins an unscoped VQueue identity instead of mixing scoped runs', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return sql.includes("target_handler_name = 'run'")
          ? [{ id: 'inv_run' }]
          : [];
      }
      if (sql.includes('FROM sys_invocation\n')) {
        return [invocation('inv_run', 'run')];
      }
      return [];
    });

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
            AND target_handler_name IN ('approve', 'status')
            AND scope IS NULL
          ORDER BY created_at DESC NULLS LAST
          LIMIT 26",
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

  it('does not promote a Shared invocation when the run disappears', async () => {
    const { context } = createContext((sql) => {
      if (
        sql.includes('FROM sys_invocation_status') &&
        sql.includes("target_handler_name = 'run'")
      ) {
        return [{ id: 'inv_run' }];
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

    expect(response.status).toBe(404);
  });
});
