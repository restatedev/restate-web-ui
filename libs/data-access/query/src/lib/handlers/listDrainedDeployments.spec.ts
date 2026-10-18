import { describe, expect, it, vi } from 'vitest';
import { listDrainedDeployments } from './listDrainedDeployments.js';
import type { QueryContext } from './shared.js';

function querySql(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.map(([sql]) => sql);
}

describe('listDrainedDeployments', () => {
  it('uses unfinished invocation VQueues to identify active deployments', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'dp_drained' }] });
    const context = {
      query,
      features: new Set(),
    } as unknown as QueryContext;

    const response = await listDrainedDeployments.call(context);

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "WITH active_deployments AS (
          SELECT deployment_id AS id
          FROM sys_service
          WHERE deployment_id IS NOT NULL

          UNION

          SELECT deployment AS id
          FROM sys_vqueues
          WHERE stage != 'finished'
            AND deployment IS NOT NULL
      )
      SELECT id
      FROM sys_deployment

      EXCEPT

      SELECT id
      FROM active_deployments",
      ]
    `);
    expect(await response.json()).toEqual({
      deployment_ids: ['dp_drained'],
    });
  });
});
