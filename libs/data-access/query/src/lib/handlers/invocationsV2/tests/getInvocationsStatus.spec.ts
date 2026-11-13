import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  rawInvocation,
} from './testUtils.js';

describe('POST /query/invocations/statuses', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue', () => {
    it('reports yielded from VQueue state instead of the joined-view status', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? [
              {
                entry_id: 'inv_a',
                stage: 'inbox',
                status: 'yielded',
                deployment: 'dp-vqueue',
              },
            ]
          : [rawInvocation('inv_a', { status: 'ready' })],
      );

      const response = await post('/invocations/statuses', {
        invocationIds: ['inv_a'],
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name, vqueue_id FROM sys_invocation WHERE id IN ('inv_a')",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_a')",
        ]
      `);
      expect(body.invocations['inv_a'].status).toBe('yielded');
      expect(body.invocations['inv_a'].pinnedDeploymentId).toBe('dp-vqueue');
    });

    it('uses one point query per table for the complete ID list', async () => {
      const invocationIds = Array.from(
        { length: 501 },
        (_, index) => `inv_${index}`,
      );
      await post('/invocations/statuses', { invocationIds });

      const sqlIds = invocationIds.map((id) => `'${id}'`).join(', ');
      expect(sql).toEqual([
        `SELECT id, status, completion_result, completion_failure, pinned_deployment_id, last_attempt_deployment_id, target_service_name, target_service_key, target_handler_name, vqueue_id FROM sys_invocation WHERE id IN (${sqlIds})`,
        `SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN (${sqlIds})`,
      ]);
    });

    it('splits long ID lists so no query body reaches the admin API’s 2 MB limit', async () => {
      const invocationIds = Array.from(
        { length: 50_001 },
        (_, index) => `inv_${String(index).padStart(34, '0')}`,
      );
      const lastId = invocationIds.at(-1)!;
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? []
          : statement.includes(`'${lastId}'`)
            ? [rawInvocation(lastId, { status: 'running' })]
            : [],
      );

      const response = await post('/invocations/statuses', { invocationIds });
      const body = await response.json();

      const idsPerQuery = (table: string) =>
        sql
          .filter((statement) => statement.includes(`FROM ${table} WHERE`))
          .map((statement) => statement.match(/'inv_/g)?.length);
      expect(idsPerQuery('sys_invocation')).toEqual([
        10_000, 10_000, 10_000, 10_000, 10_000, 1,
      ]);
      expect(idsPerQuery('sys_vqueue_entry_status')).toEqual([
        10_000, 10_000, 10_000, 10_000, 10_000, 1,
      ]);
      for (const statement of sql) {
        expect(
          new TextEncoder().encode(JSON.stringify({ query: statement })).length,
        ).toBeLessThan(2 * 1024 * 1024);
      }
      expect(Object.keys(body.invocations)).toHaveLength(50_001);
      expect(body.invocations[lastId].status).toBe('running');
    });

    it('keeps invocation status when a migrated invocation has no VQueue overlay', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status')
          ? []
          : [rawInvocation('inv_a', { vqueue_id: 'vq-a', status: 'ready' })],
      );

      const response = await post('/invocations/statuses', {
        invocationIds: ['inv_a'],
      });

      expect(await response.json()).toMatchObject({
        invocations: { inv_a: { status: 'ready' } },
      });
    });
  });
});
