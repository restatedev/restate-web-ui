import { describe, expect, it, vi } from 'vitest';
import { createInvocationV2QueryTestHarness, rawInvocation } from './testUtils';

describe('GET /query/v2/invocations/:invocationId', () => {
  const { sql, get, setResponder } = createInvocationV2QueryTestHarness();

  it('includes scopes from V2 call targets in journal entries', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [rawInvocation('inv-a')];
      }
      if (statement.includes('FROM sys_journal WHERE')) {
        return [
          {
            id: 'inv-a',
            index: 1,
            appended_at: '2026-01-01T00:00:01.000Z',
            entry_type: 'Command: Call',
            version: 2,
            entry_lite_json: JSON.stringify({
              Command: {
                Call: {
                  invocation_id: 'inv-b',
                  invocation_target: {
                    Service: {
                      name: 'ScopedTarget',
                      handler: 'handle',
                      scope: 'tenant-a',
                    },
                  },
                  result_completion_id: 1,
                },
              },
            }),
          },
          {
            id: 'inv-a',
            index: 2,
            appended_at: '2026-01-01T00:00:02.000Z',
            entry_type: 'Command: OneWayCall',
            version: 2,
            entry_lite_json: JSON.stringify({
              Command: {
                OneWayCall: {
                  invocation_id: 'inv-c',
                  invocation_target: {
                    VirtualObject: {
                      name: 'ScopedObject',
                      key: 'object-1',
                      handler: 'handle',
                      scope: 'tenant-b',
                    },
                  },
                },
              },
            }),
          },
        ];
      }
      return [];
    });

    const response = await get('/v2/invocations/inv-a');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.journal.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'Call',
          serviceName: 'ScopedTarget',
          scope: 'tenant-a',
        }),
        expect.objectContaining({
          type: 'OneWayCall',
          serviceName: 'ScopedObject',
          serviceKey: 'object-1',
          scope: 'tenant-b',
        }),
      ]),
    );
  });

  describe('VQueue', () => {
    it('looks up entry status by invocation id without a VQueue-id hint', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2026-01-01T00:00:04.000Z');
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation WHERE')) {
          return [rawInvocation('inv-a', { vqueue_id: 'vq-entry' })];
        }
        if (statement.includes('FROM sys_vqueue_entry_status')) {
          return [
            {
              entry_id: 'inv-a',
              vqueue_id: 'vq-entry',
              stage: 'inbox',
              status: 'yielded',
              next_at: '2026-01-01T00:00:05.000Z',
              created_at: '2026-01-01T00:00:00.000Z',
              transitioned_at: '2026-01-01T00:00:02.000Z',
              first_attempt_at: '2026-01-01T00:00:01.000Z',
              latest_attempt_at: '2026-01-01T00:00:02.000Z',
              first_runnable_at: '2026-01-01T00:00:01.000Z',
              retry_attempts: 2,
              retry_count_since_last_stored_command: 7,
              num_attempts: 3,
              num_errors: 2,
              deployment: 'dp-1',
            },
          ];
        }
        return [];
      });

      const response = await get('/v2/invocations/inv-a');

      expect(response.status).toBe(200);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv-a'",
          "SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json,  version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = 'inv-a' ORDER BY index",
          "SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = 'inv-a' ORDER BY appended_at",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
        ]
      `);
      expect(await response.json()).toMatchObject({
        status: 'yielded',
        duration: 'PT3S',
        vqueue: {
          vqueue_id: 'vq-entry',
          stage: 'inbox',
          status: 'yielded',
          next_at: '2026-01-01T00:00:05.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          transitioned_at: '2026-01-01T00:00:02.000Z',
          first_attempt_at: '2026-01-01T00:00:01.000Z',
          latest_attempt_at: '2026-01-01T00:00:02.000Z',
          first_runnable_at: '2026-01-01T00:00:01.000Z',
          retry_attempts: 2,
          retry_count_since_last_stored_command: 7,
          num_attempts: 3,
          num_errors: 2,
          deployment: 'dp-1',
        },
      });
    });

    it('keeps invocation status when a migrated row has no entry-status overlay', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation WHERE')
          ? [rawInvocation('inv-a', { vqueue_id: 'vq-entry' })]
          : [],
      );

      const response = await get('/v2/invocations/inv-a');

      expect(response.status).toBe(200);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv-a'",
          "SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json,  version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = 'inv-a' ORDER BY index",
          "SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = 'inv-a' ORDER BY appended_at",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
        ]
      `);
    });

    it('escapes the invocation id in every point query', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation WHERE')
          ? [rawInvocation("inv'a")]
          : [],
      );

      const response = await get('/v2/invocations/inv%27a');

      expect(response.status).toBe(200);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv''a'",
          "SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json,  version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = 'inv''a' ORDER BY index",
          "SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = 'inv''a' ORDER BY appended_at",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv''a') AND entry_kind = 'invocation'",
        ]
      `);
    });
  });
});
