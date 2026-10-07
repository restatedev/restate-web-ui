import { describe, expect, it, vi } from 'vitest';
import { getVirtualObjectInvocations } from '../getVirtualObjectInvocations';
import { getVirtualObjectInbox } from '../getVirtualObjectInbox';
import type { QueryContext } from '../shared';

function createContext(responder: (sql: string) => Record<string, unknown>[]) {
  const query = vi.fn(async (sql: string) => ({ rows: responder(sql) }));
  const context = {
    query,
    features: new Set([
      'vqueues',
      'scoped_virtual_objects',
      'protocol_v7',
      'indexes_v1',
      'ui:indexes_v1',
    ]),
    adminApi: vi.fn(),
    baseUrl: '',
    restateVersion: '1.8.0',
  } as unknown as QueryContext;
  return { context, sql: () => query.mock.calls.map(([sql]) => sql) };
}

describe('virtual object details from entry indexes', () => {
  it('lists recent invocations by last transition', async () => {
    const { context, sql } = createContext((statement) =>
      statement.includes('FROM _idx_entry_by_virtual_object')
        ? [{ entry_id: 'inv_b', stage: 'finished' }]
        : [],
    );

    await getVirtualObjectInvocations.call(context, 'Counter', 'k', 'tenant');

    expect(sql()).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_virtual_object
      WHERE service_name = 'Counter'
        AND scope = 'tenant'
        AND key = 'k'
      ORDER BY transitioned_at DESC
      LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_b')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_b')",
      ]
    `);
  });

  it('returns state mutations as entries without loading them as invocations', async () => {
    const { context, sql } = createContext((statement) => {
      if (statement.includes('FROM _idx_entry_by_virtual_object')) {
        return [{ entry_id: 'inv_b' }, { entry_id: 'mut_c' }];
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            entry_id: 'mut_c',
            vqueue_id: 'vq_1',
            stage: 'inbox',
            status: 'new',
          },
        ];
      }
      return [];
    });

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'k',
      'tenant',
    );
    const body = (await response.json()) as { rows: unknown[] };

    expect(body.rows).toEqual([
      {
        id: 'mut_c',
        kind: 'state-mutation',
        vqueueId: 'vq_1',
        stage: 'inbox',
        status: 'new',
      },
    ]);
    expect(sql()).toMatchInlineSnapshot(`
      [
        "SELECT entry_id
      FROM _idx_entry_by_virtual_object
      WHERE service_name = 'Counter'
        AND scope = 'tenant'
        AND key = 'k'
      ORDER BY transitioned_at DESC
      LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_b')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_b', 'mut_c')",
      ]
    `);
  });

  it('reads the inbox from the next-at index for unscoped objects', async () => {
    const { context, sql } = createContext(() => []);

    await getVirtualObjectInbox.call(context, 'Counter', 'k');

    expect(sql()).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/k'
            AND scope IS NULL
            AND acquired_by IS NOT NULL
          LIMIT 1",
        "SELECT entry_id, stage, next_at, seq
      FROM _idx_entry_next_at_by_virtual_object
      WHERE service_name = 'Counter'
        AND scope IS NULL
        AND key = 'k'
        AND stage = 'inbox'
      ORDER BY next_at ASC, seq ASC
      LIMIT 26",
        "SELECT SUM(num_inbox) AS inbox_count
          FROM sys_vqueue_meta
          WHERE service_name = 'Counter'
            AND lock_name = 'Counter/k'
            AND scope IS NULL",
      ]
    `);
  });
});
