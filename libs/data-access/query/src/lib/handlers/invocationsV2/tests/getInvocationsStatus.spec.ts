import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness, rawInvocation } from './testUtils';

describe('POST /query/invocations/statuses', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue', () => {
    it('reports yielded from VQueue state instead of the joined-view status', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [
              {
                entry_id: 'inv-a',
                stage: 'inbox',
                status: 'yielded',
                deployment: 'dp-vqueue',
              },
            ]
          : [rawInvocation('inv-a', { status: 'ready' })],
      );

      const response = await post('/invocations/statuses', {
        invocationIds: ['inv-a'],
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name, vqueue_id FROM sys_invocation WHERE id IN ('inv-a')",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv-a') AND entry_kind = 'invocation'",
        ]
      `);
      expect(body.invocations['inv-a'].status).toBe('yielded');
      expect(body.invocations['inv-a'].pinnedDeploymentId).toBe('dp-vqueue');
    });

    it('uses one point query per table for the complete ID list', async () => {
      const invocationIds = Array.from(
        { length: 501 },
        (_, index) => `inv-${index}`,
      );
      await post('/invocations/statuses', { invocationIds });

      const sqlIds = invocationIds.map((id) => `'${id}'`).join(', ');
      expect(sql).toEqual([
        `SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name, vqueue_id FROM sys_invocation WHERE id IN (${sqlIds})`,
        `SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN (${sqlIds}) AND entry_kind = 'invocation'`,
      ]);
    });

    it('keeps invocation status when a migrated invocation has no VQueue overlay', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? []
          : [rawInvocation('inv-a', { vqueue_id: 'vq-a', status: 'ready' })],
      );

      const response = await post('/invocations/statuses', {
        invocationIds: ['inv-a'],
      });

      expect(await response.json()).toMatchObject({
        invocations: { 'inv-a': { status: 'ready' } },
      });
    });
  });
});
