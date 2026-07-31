import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  NO_VQUEUE_HEADERS,
  rawInvocation,
} from './invocationsV2/tests/testUtils';

describe('GET /query/vqueues/:vqueueId', () => {
  const { get, setResponder, sql } = createInvocationV2QueryTestHarness();

  it('returns no content when VQueues are unavailable', async () => {
    const response = await get('/vqueues/vq_orders', NO_VQUEUE_HEADERS);

    expect(response.status).toBe(204);
    expect(sql).toMatchInlineSnapshot(`[]`);
  });

  it('returns no content when the VQueue is no longer present', async () => {
    const response = await get('/vqueues/vq_orders');

    expect(response.status).toBe(204);
    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
        service_name,
        scope,
        lock_name,
        limit_key,
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
      WHERE id = 'vq_orders' LIMIT 1",
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
      WHERE s.id = 'vq_orders'
      LIMIT 1",
      ]
    `);
  });

  it('does not report query failures as a missing VQueue', async () => {
    setResponder(() => {
      throw new Error('query failed');
    });

    const response = await get('/vqueues/vq_orders');

    expect(response.status).toBe(500);
    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
        service_name,
        scope,
        lock_name,
        limit_key,
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
      WHERE id = 'vq_orders' LIMIT 1",
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
      WHERE s.id = 'vq_orders'
      LIMIT 1",
      ]
    `);
  });

  it('returns the queue, scheduler, head, and focused entry snapshot', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_vqueue_meta')) {
        return [
          {
            service_name: 'Orders',
            scope: 'tenant-a',
            limit_key: 'priority/customer',
            queue_is_paused: false,
            num_inbox: 4,
            num_running: 1,
            num_suspended: 2,
            num_paused: 0,
            num_finished: 12,
            avg_inbox_duration: 'PT2S',
            avg_run_duration: 'PT3S',
            avg_suspension_duration: 'PT4S',
            avg_queue_duration: 'PT1S',
            avg_end_to_end_duration: 'PT9S',
            avg_blocked_on_concurrency_rules: 'PT0.5S',
            last_enqueued_at: '2026-08-04T09:00:00.000Z',
            last_start_at: '2026-08-04T09:01:00.000Z',
            last_attempt_at: '2026-08-04T09:02:00.000Z',
            last_finish_at: '2026-08-04T09:03:00.000Z',
          },
        ];
      }
      if (statement.includes('FROM sys_scheduler')) {
        return [
          {
            status: 'blocked',
            blocked_on: 'concurrency_rules',
            blocked_on_json: JSON.stringify({
              resource: 'limit-key-concurrency',
              scope: 'tenant-a',
              limit_key: 'priority/customer',
              blocked_level: 'level1',
              blocked_rule: 'tenant-a/priority/*',
            }),
            head_entry_id: 'inv_head',
            concurrency_rules_block_duration: 'PT5S',
            head_status_entry_id: 'inv_head',
            head_stage: 'inbox',
            head_status: 'new',
            head_kind: 'invocation',
            head_created_at: '2026-08-04T08:59:00.000Z',
            head_sequence_number: 7,
            head_num_attempts: 1,
            head_total_blocked_on_concurrency_rules: 'PT6S',
          },
        ];
      }
      if (statement.includes('ROW_NUMBER() OVER')) {
        return [{ position: 3 }];
      }
      if (statement.includes('FROM sys_invocation')) {
        return [
          rawInvocation('inv_focus', {
            vqueue_id: 'vq_orders',
            status: 'ready',
          }),
        ];
      }
      return [
        {
          entry_id: 'inv_focus',
          vqueue_id: 'vq_orders',
          stage: 'inbox',
          status: 'scheduled',
          sequence_number: 9,
          num_attempts: 2,
          num_errors: 1,
          created_at: '2026-08-04T08:58:00.000Z',
          total_blocked_on_lock: 'PT2S',
          latest_attempt_blocked_on_lock: 'PT1S',
        },
      ];
    });

    const response = await get('/vqueues/vq_orders?focusEntryId=inv_focus');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      identity: {
        service: 'Orders',
        scope: 'tenant-a',
        limitKey: 'priority/customer',
        isPaused: false,
        vqueueId: 'vq_orders',
      },
      status: {
        blocked: true,
        blockedOn: 'concurrency_rules',
        scheduling: 'blocked',
        blockedResource: {
          resource: 'limit-key-concurrency',
          scope: 'tenant-a',
          limitKey: 'priority/customer',
          blockedLevel: 'level1',
          blockedRule: 'tenant-a/priority/*',
        },
      },
      counts: {
        inbox: 4,
        running: 1,
        suspended: 2,
        paused: 0,
        finished: 12,
      },
      stageAvg: {
        inbox: 'PT2S',
        running: 'PT3S',
        suspended: 'PT4S',
        queue: 'PT1S',
        endToEnd: 'PT9S',
      },
      events: {
        enqueuedAt: '2026-08-04T09:00:00.000Z',
        startAt: '2026-08-04T09:01:00.000Z',
        attemptAt: '2026-08-04T09:02:00.000Z',
        finishAt: '2026-08-04T09:03:00.000Z',
      },
      head: {
        entryId: 'inv_head',
        stage: 'inbox',
        status: 'new',
        kind: 'invocation',
        createdAt: '2026-08-04T08:59:00.000Z',
        sequenceNumber: 7,
        numAttempts: 1,
        totalBlocks: [{ gate: 'concurrency_rules', duration: 'PT6S' }],
        nowBlocks: [{ gate: 'concurrency_rules', duration: 'PT5S' }],
        avgBlocks: [{ gate: 'concurrency_rules', duration: 'PT0.5S' }],
      },
      focusEntry: {
        id: 'inv_focus',
        status: 'scheduled',
        stage: 'inbox',
        position: 3,
        attempts: 2,
        errors: 1,
        createdAt: '2026-08-04T08:58:00.000Z',
        totalBlocks: [{ gate: 'lock', duration: 'PT2S' }],
        latestBlocks: [{ gate: 'lock', duration: 'PT1S' }],
      },
      focusedInvocation: {
        id: 'inv_focus',
        target: 'Greeter/inv_focus/run',
        target_service_name: 'Greeter',
        target_service_key: 'inv_focus',
        target_handler_name: 'run',
        target_service_ty: 'workflow',
        status: 'scheduled',
        created_at: '2026-01-01T00:00:00.000Z',
        modified_at: '2026-01-01T00:00:00.000Z',
        scheduled_start_at: null,
        completed_at: null,
        pinned_service_protocol_version: 7,
        retry_count: 0,
        num_attempts: 2,
        num_errors: 1,
        isRetrying: false,
        vqueue_id: 'vq_orders',
        vqueue: {
          vqueue_id: 'vq_orders',
          stage: 'inbox',
          status: 'scheduled',
          created_at: '2026-08-04T08:58:00.000Z',
          num_attempts: 2,
          num_errors: 1,
        },
      },
    });
    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
        service_name,
        scope,
        lock_name,
        limit_key,
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
      WHERE id = 'vq_orders' LIMIT 1",
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
      WHERE s.id = 'vq_orders'
      LIMIT 1",
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
      WHERE e.entry_id = 'inv_focus'
        AND e.entry_kind = 'invocation'
      LIMIT 1",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv_focus'",
        "SELECT position
      FROM (
        SELECT
          entry_id,
          ROW_NUMBER() OVER (
            ORDER BY has_lock DESC, run_at ASC, sequence_number ASC, entry_id ASC
          ) AS position
        FROM sys_vqueues
        WHERE id = 'vq_orders'
          AND stage = 'inbox'
      ) ranked
      WHERE entry_id = 'inv_focus'
      LIMIT 1",
      ]
    `);
  });

  it('omits a focused entry that does not belong to the queue', async () => {
    setResponder((statement) =>
      statement.includes('FROM sys_vqueue_meta')
        ? [
            {
              service_name: 'Orders',
              queue_is_paused: false,
              num_inbox: 0,
              num_running: 0,
              num_suspended: 0,
              num_paused: 0,
              num_finished: 0,
            },
          ]
        : [],
    );

    const response = await get(
      '/vqueues/vq_orders?focusEntryId=inv_other_queue',
    );
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).not.toHaveProperty('focusEntry');
    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
        service_name,
        scope,
        lock_name,
        limit_key,
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
      WHERE id = 'vq_orders' LIMIT 1",
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
      WHERE s.id = 'vq_orders'
      LIMIT 1",
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
      WHERE e.entry_id = 'inv_other_queue'
        AND e.entry_kind = 'invocation'
      LIMIT 1",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv_other_queue'",
      ]
    `);
  });
});
