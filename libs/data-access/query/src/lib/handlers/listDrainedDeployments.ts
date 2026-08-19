import type { QueryContext } from './shared';

const DRAINED_DEPLOYMENTS_QUERY = `WITH active_deployments AS (
    SELECT DISTINCT deployment_id AS id
    FROM sys_service
    WHERE deployment_id IS NOT NULL
    UNION
    SELECT DISTINCT pinned_deployment_id AS id
    FROM sys_invocation_status
    WHERE pinned_deployment_id IS NOT NULL AND status != 'completed'
)
SELECT d.id AS id
FROM sys_deployment d
EXCEPT
SELECT id
FROM active_deployments`;

const VQUEUE_DRAINED_DEPLOYMENTS_QUERY = `WITH active_deployments AS (
    SELECT deployment_id AS id
    FROM sys_service
    WHERE deployment_id IS NOT NULL

    UNION

    SELECT deployment AS id
    FROM sys_vqueues
    WHERE entry_kind = 'invocation'
      AND stage != 'finished'
      AND deployment IS NOT NULL
)
SELECT id
FROM sys_deployment

EXCEPT

SELECT id
FROM active_deployments`;

export async function listDrainedDeployments(this: QueryContext) {
  const hasVqueues = this.features.has('vqueues');
  const { rows } = await this.query(
    hasVqueues ? VQUEUE_DRAINED_DEPLOYMENTS_QUERY : DRAINED_DEPLOYMENTS_QUERY,
    hasVqueues ? 'deployments/drained' : 'deployments/drained-legacy',
  );

  return Response.json({
    deployment_ids: rows.map(({ id }) => id as string),
  });
}
