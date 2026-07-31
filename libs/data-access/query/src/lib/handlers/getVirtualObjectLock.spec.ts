import type { RawInvocation } from '@restate/data-access/admin-api-spec';
import { describe, expect, it, vi } from 'vitest';
import type { QueryContext } from './shared';
import { getVirtualObjectLock } from './getVirtualObjectLock';
import {
  createInvocationV2QueryTestHarness,
  NO_VQUEUE_HEADERS,
} from './invocationsV2/tests/testUtils';

function invocation(
  id: string,
  overrides: Partial<RawInvocation> = {},
): RawInvocation {
  return {
    id,
    created_at: '2026-07-23T08:00:00.000Z',
    modified_at: '2026-07-23T08:05:00.000Z',
    scheduled_at: '2026-07-23T08:00:00.000Z',
    invoked_by: 'ingress',
    status: 'running',
    target: 'Counter/customer-1/add',
    target_service_name: 'Counter',
    target_service_key: 'customer-1',
    target_handler_name: 'add',
    target_service_ty: 'virtual_object',
    ...overrides,
  };
}

describe('GET /query/virtual-objects/:service/instances/:key/lock', () => {
  const { get, setResponder, sql } = createInvocationV2QueryTestHarness();

  it('returns the invocation currently holding the scoped lock', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_locks')) {
        return [
          {
            acquired_by: 'inv_1lock',
            acquired_at: '2026-07-23T09:00:00.000Z',
          },
        ];
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            id: 'inv_1lock',
            kind: 'invocation',
            vqueue_id: 'vq_1lock',
            stage: 'running',
            status: 'started',
            has_lock: true,
          },
        ];
      }
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [invocation('inv_1lock')];
      }
      return [];
    });

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock?scope=tenant-a',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope = 'tenant-a'
            AND acquired_by IS NOT NULL
          LIMIT 1",
        "SELECT
            entry_id AS id,
            entry_kind AS kind,
            vqueue_id,
            stage,
            status,
            has_lock,
            next_at AS run_at,
            sequence_number,
            created_at,
            transitioned_at,
            first_attempt_at,
            latest_attempt_at,
            first_runnable_at,
            retry_attempts,
            retry_count_since_last_stored_command,
            num_attempts,
            num_errors,
            deployment
          FROM sys_vqueue_entry_status
          WHERE entry_id IN ('inv_1lock')
            AND stage <> 'finished'",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_1lock')",
      ]
    `);
    expect(await response.json()).toMatchObject({
      supported: true,
      lockHolder: {
        id: 'inv_1lock',
        kind: 'invocation',
        acquiredAt: '2026-07-23T09:00:00.000Z',
        vqueueId: 'vq_1lock',
        stage: 'running',
        status: 'started',
        hasLock: true,
        invocation: expect.objectContaining({
          id: 'inv_1lock',
          target_handler_name: 'add',
        }),
      },
    });
  });

  it('returns a hydrated state mutation lock holder', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_locks')) {
        return [
          {
            acquired_by: 'mut_1sm',
            acquired_at: '2026-07-23T09:05:00.000Z',
          },
        ];
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            id: 'mut_1sm',
            kind: 'state-mutation',
            vqueue_id: 'vq_1sm',
            stage: 'running',
            status: 'started',
            has_lock: true,
          },
        ];
      }
      return [];
    });

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope IS NULL
            AND acquired_by IS NOT NULL
          LIMIT 1",
        "SELECT
            entry_id AS id,
            entry_kind AS kind,
            vqueue_id,
            stage,
            status,
            has_lock,
            next_at AS run_at,
            sequence_number,
            created_at,
            transitioned_at,
            first_attempt_at,
            latest_attempt_at,
            first_runnable_at,
            retry_attempts,
            retry_count_since_last_stored_command,
            num_attempts,
            num_errors,
            deployment
          FROM sys_vqueue_entry_status
          WHERE entry_id IN ('mut_1sm')
            AND stage <> 'finished'",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      lockHolder: {
        id: 'mut_1sm',
        kind: 'state-mutation',
        acquiredAt: '2026-07-23T09:05:00.000Z',
        vqueueId: 'vq_1sm',
        stage: 'running',
        status: 'started',
        hasLock: true,
      },
    });
  });

  it('preserves an unrecognized lock holder kind', async () => {
    setResponder(() => [
      {
        acquired_by: 'migration-holder',
        acquired_at: '2026-07-23T09:10:00.000Z',
      },
    ]);

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope IS NULL
            AND acquired_by IS NOT NULL
          LIMIT 1",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      lockHolder: {
        id: 'migration-holder',
        kind: 'other',
        acquiredAt: '2026-07-23T09:10:00.000Z',
      },
    });
  });

  it('uses the legacy keyed service lock for unscoped objects', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_keyed_service_status')) {
        return { rows: [{ invocation_id: 'inv_1legacy' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            invocation('inv_1legacy', {
              running_at: '2026-07-23T09:15:00.000Z',
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const context = {
      query,
      baseUrl: '',
      restateVersion: '1.7.3',
      features: new Set(['protocol_v7']),
    } as unknown as QueryContext;

    const response = await getVirtualObjectLock.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(query.mock.calls.map(([statement]) => statement))
      .toMatchInlineSnapshot(`
        [
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json
            FROM sys_invocation
            WHERE id IN ('inv_1legacy')",
        ]
      `);
    expect(await response.json()).toMatchObject({
      supported: true,
      lockHolder: {
        id: 'inv_1legacy',
        kind: 'invocation',
        acquiredAt: '2026-07-23T09:15:00.000Z',
        invocation: expect.objectContaining({
          id: 'inv_1legacy',
          status: 'running',
        }),
      },
    });
  });

  it('reports scoped locks as unsupported without Virtual Queues', async () => {
    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock?scope=tenant-a',
      NO_VQUEUE_HEADERS,
    );

    expect(sql).toEqual([]);
    expect(await response.json()).toEqual({ supported: false });
  });
});
