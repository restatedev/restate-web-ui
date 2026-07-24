import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils';

describe('POST /query/invocations/summary', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  it('applies filters after the bounded invocation-status source', async () => {
    setResponder(() => []);

    const response = await post('/invocations/summary', {
      filters: [
        {
          type: 'STRING',
          field: 'target_handler_name',
          operation: 'EQUALS',
          value: 'run',
        },
      ],
      sampled: true,
      sampleSize: 5,
    });

    expect(response.status).toBe(200);
    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT CASE WHEN status = 'invoked' AND vq.vq_status = 'backing-off' THEN 'backing-off' WHEN status = 'invoked' AND vq.vq_status = 'yielded' THEN 'ready' WHEN status = 'invoked' THEN 'running' WHEN status = 'inboxed' THEN 'pending' ELSE status END AS status, completion_result, target_service_name, target_handler_name, COUNT(1) as count FROM (SELECT id, status, completion_result, target_service_name, target_handler_name FROM sys_invocation_status LIMIT 5) si LEFT JOIN (SELECT entry_id, status AS vq_status FROM sys_vqueues WHERE stage = 'inbox' AND status IN ('backing-off', 'yielded')) vq ON vq.entry_id = si.id WHERE "target_handler_name" = 'run' GROUP BY CASE WHEN status = 'invoked' AND vq.vq_status = 'backing-off' THEN 'backing-off' WHEN status = 'invoked' AND vq.vq_status = 'yielded' THEN 'ready' WHEN status = 'invoked' THEN 'running' WHEN status = 'inboxed' THEN 'pending' ELSE status END, completion_result, target_service_name, target_handler_name",
      ]
    `);
  });
});
