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

export async function listDrainedDeployments(this: QueryContext) {
  const { rows } = await this.query(DRAINED_DEPLOYMENTS_QUERY);

  return Response.json({
    deployment_ids: rows.map(({ id }) => id as string),
  });
}
