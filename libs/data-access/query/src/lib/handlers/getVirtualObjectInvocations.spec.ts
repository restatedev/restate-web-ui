import type {
  RawInvocation,
  Service,
} from '@restate/data-access/admin-api-spec';
import { describe, expect, it, vi } from 'vitest';
import { getVirtualObjectInvocations } from './getVirtualObjectInvocations';
import type { QueryContext } from './shared';

const serviceMetadata = {
  handlers: [
    { name: 'add', ty: 'Exclusive' },
    { name: 'read', ty: 'Shared' },
  ],
} as Service;

function createAdminApiMock(): QueryContext['adminApi'] {
  const owner: { adminApi: QueryContext['adminApi'] } = {
    adminApi: async <T>() => serviceMetadata as T,
  };
  vi.spyOn(owner, 'adminApi');
  return owner.adminApi;
}

function rawInvocation(
  id: string,
  handler: string,
  overrides: Partial<RawInvocation> = {},
): RawInvocation {
  return {
    id,
    created_at: '2026-07-23T08:00:00.000Z',
    modified_at: '2026-07-23T08:05:00.000Z',
    scheduled_at: '2026-07-23T08:00:00.000Z',
    invoked_by: 'ingress',
    status: 'completed',
    completion_result: 'success',
    target: `Counter/customer-1/${handler}`,
    target_service_name: 'Counter',
    target_service_key: 'customer-1',
    target_handler_name: handler,
    target_service_ty: 'virtual_object',
    ...overrides,
  };
}

function contextWith(
  query: QueryContext['query'],
  features: string[],
  adminApi: QueryContext['adminApi'] = createAdminApiMock(),
) {
  return {
    query,
    adminApi,
    baseUrl: '',
    restateVersion: '1.7.2',
    features: new Set(features),
  } satisfies QueryContext;
}

function queryStatements(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.map(([statement]) => String(statement));
}

describe('GET /query/virtual-objects/:service/instances/:key/invocations', () => {
  it('uses direct key equality on Restate 1.7.3', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_invocation_status')) {
        return { rows: [{ id: 'inv_1shared' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return { rows: [rawInvocation('inv_1shared', 'read')] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);
    context.restateVersion = '1.7.3';

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(queryStatements(query)).toMatchInlineSnapshot(`
        [
          "SELECT si.id
            FROM sys_invocation_status si
            WHERE si.target_service_ty = 'virtual_object'
              AND si.target_service_name = 'Counter'
              AND si.target_service_key = 'customer-1'
              AND si.scope = 'tenant-a'
            ORDER BY si.created_at DESC NULLS LAST
            LIMIT 51",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
            FROM sys_invocation
            WHERE id IN ('inv_1shared')",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_1shared') AND entry_kind = 'invocation'",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        expect.objectContaining({
          id: 'inv_1shared',
          status: 'succeeded',
          target_handler_name: 'read',
        }),
      ],
      limit: 50,
      truncated: false,
    });
  });

  it('does not query unscoped invocation tables for a scoped identity without VQueues', async () => {
    const query = vi.fn();
    const context = contextWith(query, []);

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(query).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      supported: false,
      rows: [],
      limit: 50,
      truncated: false,
    });
  });

  it('returns lock holders without loading lock or inbox data', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_invocation_status')) {
        return {
          rows: [{ id: 'inv_1exclusive' }, { id: 'inv_1waiting' }],
        };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: [
            {
              entry_id: 'inv_1exclusive',
              vqueue_id: 'vq_1exclusive',
              stage: 'inbox',
              status: 'backing-off',
            },
            {
              entry_id: 'inv_1waiting',
              vqueue_id: 'vq_1waiting',
              stage: 'inbox',
              status: 'pending',
            },
          ],
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            rawInvocation('inv_1exclusive', 'add', {
              status: 'backing-off',
              running_at: '2026-07-23T08:10:00.000Z',
              completion_result: undefined,
            }),
            rawInvocation('inv_1waiting', 'add', {
              status: 'pending',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(queryStatements(query)).toMatchInlineSnapshot(`
      [
        "SELECT si.id
          FROM sys_invocation_status si
          WHERE si.target_service_ty = 'virtual_object'
            AND si.target_service_name = 'Counter'
            AND SUBSTR(si.target_service_key, 1) = 'customer-1'
            AND si.scope IS NULL
          ORDER BY si.created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_1exclusive', 'inv_1waiting')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_1exclusive', 'inv_1waiting') AND entry_kind = 'invocation'",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        expect.objectContaining({
          id: 'inv_1exclusive',
          status: 'backing-off',
        }),
        expect.objectContaining({
          id: 'inv_1waiting',
          status: 'pending',
        }),
      ],
      limit: 50,
      truncated: false,
    });
  });
});
