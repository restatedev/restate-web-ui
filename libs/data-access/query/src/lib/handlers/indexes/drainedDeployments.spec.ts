import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from '../invocationsV2/tests/testUtils';

const INDEX_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.8.0',
  'x-restate-features': 'vqueues,indexes_v1,track_status_gauges',
};

describe('drained deployments', () => {
  const harness = createInvocationV2QueryTestHarness();

  it('uses deployment stats when indexes are enabled', async () => {
    harness.setResponder(() => [{ id: 'dp_1' }]);

    const response = await harness.get('/deployments/drained', INDEX_HEADERS);

    expect(await response.json()).toEqual({ deployment_ids: ['dp_1'] });
    expect(harness.sql).toMatchInlineSnapshot(`
      [
        "WITH active_deployments AS (
          SELECT deployment_id AS id
          FROM sys_service
          WHERE deployment_id IS NOT NULL

          UNION

          SELECT deployment_id AS id
          FROM sys_deployment_stats
          WHERE stage IN ('inbox', 'running', 'suspended', 'paused')
      )
      SELECT id
      FROM sys_deployment

      EXCEPT

      SELECT id
      FROM active_deployments",
      ]
    `);
  });

  it('keeps the VQueue query without the stats server feature', async () => {
    await harness.get('/deployments/drained', {
      ...INDEX_HEADERS,
      'x-restate-features': 'vqueues,indexes_v1',
    });

    expect(harness.sql).toMatchInlineSnapshot(`
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
  });
});
