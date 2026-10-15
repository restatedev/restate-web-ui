import type { QueryContext } from './shared';
import { usesStatsTables } from '../uiFeatures';
import { DEPLOYMENT_STATS } from './indexes';

const VQUEUE_DRAINED_DEPLOYMENTS_QUERY = `WITH active_deployments AS (
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
FROM active_deployments`;

const STATS_DRAINED_DEPLOYMENTS_QUERY = `WITH active_deployments AS (
    SELECT deployment_id AS id
    FROM sys_service
    WHERE deployment_id IS NOT NULL

    UNION

    SELECT deployment_id AS id
    FROM ${DEPLOYMENT_STATS.name}
    WHERE stage IN ('inbox', 'running', 'suspended', 'paused')
)
SELECT id
FROM sys_deployment

EXCEPT

SELECT id
FROM active_deployments`;

function drainedDeploymentsQuery(context: QueryContext) {
  if (usesStatsTables(context)) {
    return [
      STATS_DRAINED_DEPLOYMENTS_QUERY,
      'deployments/drained-from-stats',
    ] as const;
  }
  return [VQUEUE_DRAINED_DEPLOYMENTS_QUERY, 'deployments/drained'] as const;
}

export async function listDrainedDeployments(this: QueryContext) {
  const [sql, id] = drainedDeploymentsQuery(this);
  const { rows } = await this.query(sql, id);

  return Response.json({
    deployment_ids: rows.map(({ id }) => id as string),
  });
}
