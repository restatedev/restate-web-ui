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
    it('includes the focused VQueue snapshot in the polled journal response', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation WHERE')) {
          return [rawInvocation('inv-a', { vqueue_id: 'vq-entry' })];
        }
        if (statement.includes('FROM sys_vqueue_entry_status e')) {
          return [
            {
              entry_id: 'inv-a',
              vqueue_id: 'vq-entry',
              stage: 'running',
              status: 'started',
              created_at: '2026-01-01T00:00:00.000Z',
              first_runnable_at: '2026-01-01T00:00:01.000Z',
              first_attempt_at: '2026-01-01T00:00:02.000Z',
              latest_attempt_at: '2026-01-01T00:00:03.000Z',
              transitioned_at: '2026-01-01T00:00:03.000Z',
              retry_attempts: 4,
              retry_count_since_last_stored_command: 2,
              num_attempts: 3,
              num_errors: 1,
              num_suspensions: 2,
              num_pauses: 1,
              num_yields: 3,
            },
          ];
        }
        if (statement.includes('FROM sys_vqueue_entry_status WHERE')) {
          return [
            {
              entry_id: 'inv-a',
              vqueue_id: 'vq-entry',
              stage: 'running',
              status: 'started',
              created_at: '2026-01-01T00:00:00.000Z',
              first_runnable_at: '2026-01-01T00:00:01.000Z',
              first_attempt_at: '2026-01-01T00:00:02.000Z',
              latest_attempt_at: '2026-01-01T00:00:03.000Z',
              transitioned_at: '2026-01-01T00:00:03.000Z',
              retry_attempts: 4,
              retry_count_since_last_stored_command: 2,
              num_attempts: 3,
              num_errors: 1,
            },
          ];
        }
        if (statement.includes('FROM sys_vqueue_meta')) {
          return [
            {
              service_name: 'Greeter',
              limit_key: 'tenant-a',
              queue_is_paused: false,
              num_inbox: 2,
              num_running: 1,
              num_suspended: 0,
              num_paused: 0,
              num_finished: 8,
              avg_queue_duration: 'PT0.5S',
              avg_end_to_end_duration: 'PT5S',
            },
          ];
        }
        if (statement.includes('FROM sys_scheduler')) {
          return [
            {
              status: 'ready',
              head_entry_id: 'inv-a',
              head_status_entry_id: 'inv-a',
              head_stage: 'running',
              head_status: 'started',
              head_kind: 'invocation',
            },
          ];
        }
        return [];
      });

      const response = await get('/v2/invocations/inv-a');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.vqueueSnapshot).toMatchObject({
        identity: {
          service: 'Greeter',
          limitKey: 'tenant-a',
          vqueueId: 'vq-entry',
        },
        counts: { inbox: 2, running: 1, finished: 8 },
        stageAvg: { queue: 'PT0.5S', endToEnd: 'PT5S' },
        head: { entryId: 'inv-a', stage: 'running', status: 'started' },
        focusEntry: {
          id: 'inv-a',
          stage: 'running',
          attempts: 3,
          suspensions: 2,
          pauses: 1,
          yields: 3,
          errors: 1,
        },
        focusedInvocation: {
          id: 'inv-a',
          vqueue_id: 'vq-entry',
        },
      });
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv-a'",
          "SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json,  version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = 'inv-a' ORDER BY index",
          "SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = 'inv-a' ORDER BY appended_at",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
          "SELECT
          service_name,
          scope,
          lock_name,
          limit_key,
          created_at,
          queue_is_paused,
          num_inbox,
          num_running,
          num_suspended,
          num_paused,
          num_finished,
          avg_inbox_duration,
          avg_run_duration,
          avg_suspension_duration,
          avg_queue_duration,
          avg_end_to_end_duration,
          avg_blocked_on_concurrency_rules,
          avg_blocked_on_invoker_concurrency,
          avg_blocked_on_invoker_throttling,
          avg_blocked_on_lock,
          last_enqueued_at,
          last_start_at,
          last_attempt_at,
          last_finish_at
        FROM sys_vqueue_meta
        WHERE id = 'vq-entry'",
          "SELECT
          s.status,
          s.blocked_on,
          s.blocked_on_json,
          s.head_entry_id,
          s.scheduled_at,
          s.invoker_concurrency_block_duration,
          s.throttling_rules_block_duration,
          s.invoker_throttling_block_duration,
          s.invoker_memory_block_duration,
          s.concurrency_rules_block_duration,
          s.lock_block_duration,
          s.deployment_concurrency_block_duration,
          h.entry_id AS head_status_entry_id,
          h.stage AS head_stage,
          h.status AS head_status,
          h.entry_kind AS head_kind,
          h.transitioned_at AS head_transitioned_at,
          h.next_at AS head_next_at,
          h.created_at AS head_created_at,
          h.sequence_number AS head_sequence_number,
          h.retry_attempts AS head_retry_attempts,
          h.num_attempts AS head_num_attempts,
          h.num_errors AS head_num_errors,
          h.num_suspensions AS head_num_suspensions,
          h.num_pauses AS head_num_pauses,
          h.num_yields AS head_num_yields,
          h.deployment AS head_deployment,
          h.has_lock AS head_has_lock,
          h.total_blocked_on_invoker_concurrency AS head_total_blocked_on_invoker_concurrency,
          h.total_blocked_on_throttling_rules AS head_total_blocked_on_throttling_rules,
          h.total_blocked_on_invoker_throttling AS head_total_blocked_on_invoker_throttling,
          h.total_blocked_on_invoker_memory AS head_total_blocked_on_invoker_memory,
          h.total_blocked_on_concurrency_rules AS head_total_blocked_on_concurrency_rules,
          h.total_blocked_on_lock AS head_total_blocked_on_lock,
          h.total_blocked_on_deployment_concurrency AS head_total_blocked_on_deployment_concurrency
        FROM sys_scheduler s
        LEFT JOIN sys_vqueue_entry_status h
          ON h.vqueue_id = s.id AND h.entry_id = s.head_entry_id
        WHERE s.id = 'vq-entry'",
          "SELECT
          e.entry_id,
          e.vqueue_id,
          e.stage,
          e.status,
          e.sequence_number,
          e.created_at,
          e.first_runnable_at,
          e.first_attempt_at,
          e.latest_attempt_at,
          e.transitioned_at,
          e.next_at,
          e.retry_attempts,
          e.retry_count_since_last_stored_command,
          e.num_attempts,
          e.num_errors,
          e.num_suspensions,
          e.num_pauses,
          e.num_yields,
          e.deployment,
          e.total_blocked_on_invoker_concurrency,
          e.total_blocked_on_throttling_rules,
          e.total_blocked_on_invoker_throttling,
          e.total_blocked_on_invoker_memory,
          e.total_blocked_on_concurrency_rules,
          e.total_blocked_on_lock,
          e.total_blocked_on_deployment_concurrency,
          e.latest_attempt_blocked_on_invoker_concurrency,
          e.latest_attempt_blocked_on_throttling_rules,
          e.latest_attempt_blocked_on_invoker_throttling,
          e.latest_attempt_blocked_on_invoker_memory,
          e.latest_attempt_blocked_on_concurrency_rules,
          e.latest_attempt_blocked_on_lock,
          e.latest_attempt_blocked_on_deployment_concurrency
        FROM sys_vqueue_entry_status e
        WHERE e.entry_id = 'inv-a'
          AND e.entry_kind = 'invocation'",
        ]
      `);
    });

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
          "SELECT
          service_name,
          scope,
          lock_name,
          limit_key,
          created_at,
          queue_is_paused,
          num_inbox,
          num_running,
          num_suspended,
          num_paused,
          num_finished,
          avg_inbox_duration,
          avg_run_duration,
          avg_suspension_duration,
          avg_queue_duration,
          avg_end_to_end_duration,
          avg_blocked_on_concurrency_rules,
          avg_blocked_on_invoker_concurrency,
          avg_blocked_on_invoker_throttling,
          avg_blocked_on_lock,
          last_enqueued_at,
          last_start_at,
          last_attempt_at,
          last_finish_at
        FROM sys_vqueue_meta
        WHERE id = 'vq-entry'",
          "SELECT
          s.status,
          s.blocked_on,
          s.blocked_on_json,
          s.head_entry_id,
          s.scheduled_at,
          s.invoker_concurrency_block_duration,
          s.throttling_rules_block_duration,
          s.invoker_throttling_block_duration,
          s.invoker_memory_block_duration,
          s.concurrency_rules_block_duration,
          s.lock_block_duration,
          s.deployment_concurrency_block_duration,
          h.entry_id AS head_status_entry_id,
          h.stage AS head_stage,
          h.status AS head_status,
          h.entry_kind AS head_kind,
          h.transitioned_at AS head_transitioned_at,
          h.next_at AS head_next_at,
          h.created_at AS head_created_at,
          h.sequence_number AS head_sequence_number,
          h.retry_attempts AS head_retry_attempts,
          h.num_attempts AS head_num_attempts,
          h.num_errors AS head_num_errors,
          h.num_suspensions AS head_num_suspensions,
          h.num_pauses AS head_num_pauses,
          h.num_yields AS head_num_yields,
          h.deployment AS head_deployment,
          h.has_lock AS head_has_lock,
          h.total_blocked_on_invoker_concurrency AS head_total_blocked_on_invoker_concurrency,
          h.total_blocked_on_throttling_rules AS head_total_blocked_on_throttling_rules,
          h.total_blocked_on_invoker_throttling AS head_total_blocked_on_invoker_throttling,
          h.total_blocked_on_invoker_memory AS head_total_blocked_on_invoker_memory,
          h.total_blocked_on_concurrency_rules AS head_total_blocked_on_concurrency_rules,
          h.total_blocked_on_lock AS head_total_blocked_on_lock,
          h.total_blocked_on_deployment_concurrency AS head_total_blocked_on_deployment_concurrency
        FROM sys_scheduler s
        LEFT JOIN sys_vqueue_entry_status h
          ON h.vqueue_id = s.id AND h.entry_id = s.head_entry_id
        WHERE s.id = 'vq-entry'",
          "SELECT
          e.entry_id,
          e.vqueue_id,
          e.stage,
          e.status,
          e.sequence_number,
          e.created_at,
          e.first_runnable_at,
          e.first_attempt_at,
          e.latest_attempt_at,
          e.transitioned_at,
          e.next_at,
          e.retry_attempts,
          e.retry_count_since_last_stored_command,
          e.num_attempts,
          e.num_errors,
          e.num_suspensions,
          e.num_pauses,
          e.num_yields,
          e.deployment,
          e.total_blocked_on_invoker_concurrency,
          e.total_blocked_on_throttling_rules,
          e.total_blocked_on_invoker_throttling,
          e.total_blocked_on_invoker_memory,
          e.total_blocked_on_concurrency_rules,
          e.total_blocked_on_lock,
          e.total_blocked_on_deployment_concurrency,
          e.latest_attempt_blocked_on_invoker_concurrency,
          e.latest_attempt_blocked_on_throttling_rules,
          e.latest_attempt_blocked_on_invoker_throttling,
          e.latest_attempt_blocked_on_invoker_memory,
          e.latest_attempt_blocked_on_concurrency_rules,
          e.latest_attempt_blocked_on_lock,
          e.latest_attempt_blocked_on_deployment_concurrency
        FROM sys_vqueue_entry_status e
        WHERE e.entry_id = 'inv-a'
          AND e.entry_kind = 'invocation'",
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
          "SELECT
          service_name,
          scope,
          lock_name,
          limit_key,
          created_at,
          queue_is_paused,
          num_inbox,
          num_running,
          num_suspended,
          num_paused,
          num_finished,
          avg_inbox_duration,
          avg_run_duration,
          avg_suspension_duration,
          avg_queue_duration,
          avg_end_to_end_duration,
          avg_blocked_on_concurrency_rules,
          avg_blocked_on_invoker_concurrency,
          avg_blocked_on_invoker_throttling,
          avg_blocked_on_lock,
          last_enqueued_at,
          last_start_at,
          last_attempt_at,
          last_finish_at
        FROM sys_vqueue_meta
        WHERE id = 'vq-entry'",
          "SELECT
          s.status,
          s.blocked_on,
          s.blocked_on_json,
          s.head_entry_id,
          s.scheduled_at,
          s.invoker_concurrency_block_duration,
          s.throttling_rules_block_duration,
          s.invoker_throttling_block_duration,
          s.invoker_memory_block_duration,
          s.concurrency_rules_block_duration,
          s.lock_block_duration,
          s.deployment_concurrency_block_duration,
          h.entry_id AS head_status_entry_id,
          h.stage AS head_stage,
          h.status AS head_status,
          h.entry_kind AS head_kind,
          h.transitioned_at AS head_transitioned_at,
          h.next_at AS head_next_at,
          h.created_at AS head_created_at,
          h.sequence_number AS head_sequence_number,
          h.retry_attempts AS head_retry_attempts,
          h.num_attempts AS head_num_attempts,
          h.num_errors AS head_num_errors,
          h.num_suspensions AS head_num_suspensions,
          h.num_pauses AS head_num_pauses,
          h.num_yields AS head_num_yields,
          h.deployment AS head_deployment,
          h.has_lock AS head_has_lock,
          h.total_blocked_on_invoker_concurrency AS head_total_blocked_on_invoker_concurrency,
          h.total_blocked_on_throttling_rules AS head_total_blocked_on_throttling_rules,
          h.total_blocked_on_invoker_throttling AS head_total_blocked_on_invoker_throttling,
          h.total_blocked_on_invoker_memory AS head_total_blocked_on_invoker_memory,
          h.total_blocked_on_concurrency_rules AS head_total_blocked_on_concurrency_rules,
          h.total_blocked_on_lock AS head_total_blocked_on_lock,
          h.total_blocked_on_deployment_concurrency AS head_total_blocked_on_deployment_concurrency
        FROM sys_scheduler s
        LEFT JOIN sys_vqueue_entry_status h
          ON h.vqueue_id = s.id AND h.entry_id = s.head_entry_id
        WHERE s.id = 'vq-entry'",
          "SELECT
          e.entry_id,
          e.vqueue_id,
          e.stage,
          e.status,
          e.sequence_number,
          e.created_at,
          e.first_runnable_at,
          e.first_attempt_at,
          e.latest_attempt_at,
          e.transitioned_at,
          e.next_at,
          e.retry_attempts,
          e.retry_count_since_last_stored_command,
          e.num_attempts,
          e.num_errors,
          e.num_suspensions,
          e.num_pauses,
          e.num_yields,
          e.deployment,
          e.total_blocked_on_invoker_concurrency,
          e.total_blocked_on_throttling_rules,
          e.total_blocked_on_invoker_throttling,
          e.total_blocked_on_invoker_memory,
          e.total_blocked_on_concurrency_rules,
          e.total_blocked_on_lock,
          e.total_blocked_on_deployment_concurrency,
          e.latest_attempt_blocked_on_invoker_concurrency,
          e.latest_attempt_blocked_on_throttling_rules,
          e.latest_attempt_blocked_on_invoker_throttling,
          e.latest_attempt_blocked_on_invoker_memory,
          e.latest_attempt_blocked_on_concurrency_rules,
          e.latest_attempt_blocked_on_lock,
          e.latest_attempt_blocked_on_deployment_concurrency
        FROM sys_vqueue_entry_status e
        WHERE e.entry_id = 'inv-a'
          AND e.entry_kind = 'invocation'",
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
