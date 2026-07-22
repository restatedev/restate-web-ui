import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  rawInvocation,
  VQUEUE_SKIP_COMPLETED_HEADERS,
} from './testUtils';

describe('GET /query/invocations/:invocationId', () => {
  const { sql, get, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue', () => {
    it('keeps invocation timestamps and adds the VQueue fields', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [
              {
                entry_id: 'inv-a',
                stage: 'inbox',
                status: 'yielded',
                next_at: '2026-01-01T00:00:20.000Z',
                deployment: 'dp-vqueue',
                retry_attempts: 3,
                retry_count_since_last_stored_command: 7,
                num_attempts: 4,
                num_errors: 2,
                latest_attempt_at: '2026-01-01T00:00:10.000Z',
                first_runnable_at: '2026-01-01T00:00:01.000Z',
                first_attempt_at: '2026-01-01T00:00:02.000Z',
              },
            ]
          : [
              rawInvocation('inv-a', {
                modified_at: '2026-01-01T00:00:15.000Z',
              }),
            ],
      );

      const response = await get('/invocations/inv-a');
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv-a'",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
        ]
      `);
      expect(body).toMatchObject({
        status: 'yielded',
        created_at: '2026-01-01T00:00:00.000Z',
        modified_at: '2026-01-01T00:00:15.000Z',
        pinned_deployment_id: 'dp-vqueue',
        first_runnable_at: '2026-01-01T00:00:01.000Z',
        num_attempts: 4,
        num_errors: 2,
        retry_count: 7,
        running_at: '2026-01-01T00:00:02.000Z',
        last_start_at: '2026-01-01T00:00:10.000Z',
      });
    });

    it('uses the authoritative terminal VQueue outcome', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [{ entry_id: 'inv-a', stage: 'finished', status: 'cancelled' }]
          : [
              rawInvocation('inv-a', {
                status: 'completed',
                completion_result: 'failure',
                completion_failure: 'unknown legacy text',
              }),
            ],
      );

      const response = await get('/invocations/inv-a');

      expect(await response.json()).toMatchObject({ status: 'cancelled' });
    });

    it('marks a running VQueue retry without requiring a legacy last failure', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [
              {
                entry_id: 'inv-a',
                stage: 'running',
                status: 'started',
                retry_count_since_last_stored_command: 1,
              },
            ]
          : [rawInvocation('inv-a', { status: 'ready', last_failure: null })],
      );

      const response = await get('/invocations/inv-a');

      expect(await response.json()).toMatchObject({
        status: 'running',
        retry_count: 1,
        isRetrying: true,
      });
    });

    it('uses entry status whenever the VQueue feature is enabled', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [{ entry_id: 'inv-a', stage: 'inbox', status: 'backing-off' }]
          : [rawInvocation('inv-a', { status: 'ready' })],
      );

      const response = await get('/invocations/inv-a', {
        'content-type': 'application/json',
        'x-restate-version': '1.7.1',
        'x-restate-features': 'vqueues,protocol_v7',
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, last_awaiting_on_future_json, suspended_waiting_for_completions, suspended_waiting_for_signals, suspended_waiting_future_json, scope, vqueue_id, limit_key, invoked_by_service_name, trace_id, created_using_restate_version, last_failure_related_entry_index, last_failure_related_entry_name, last_failure_related_entry_type, last_failure_related_command_index, last_failure_related_command_name, last_failure_related_command_type FROM sys_invocation WHERE id = 'inv-a'",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
        ]
      `);
      expect(await response.json()).toMatchObject({ status: 'backing-off' });
    });

    it('keeps invocation status when the VQueue overlay is unavailable', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? []
          : [rawInvocation('inv-a', { vqueue_id: 'vq-a', status: 'ready' })],
      );

      const response = await get('/invocations/inv-a');

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'ready' });
    });

    it('uses invocation status for an invocation omitted by skip-completed migration', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? []
          : [
              rawInvocation('inv-a', {
                status: 'completed',
                completion_result: 'success',
              }),
            ],
      );

      const response = await get(
        '/invocations/inv-a',
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(await response.json()).toMatchObject({ status: 'succeeded' });
    });
  });
});
