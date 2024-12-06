import { Invocation, useListDeployments } from '@restate/data-access/admin-api';
import { Deployment } from '@restate/features/overview-route';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'text-xs p-0 pr-0.5 m-0 [&_a:before]:rounded-md [&>*]:ml-0',
});

export function DeploymentCell({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { data } = useListDeployments();
  const deploymentId =
    invocation.last_attempt_deployment_id ?? invocation.pinned_deployment_id;
  if (deploymentId) {
    const deployment = data?.deployments.get(deploymentId);
    const revision = deployment?.services.find(
      ({ name }) => name === invocation.target_service_name
    )?.revision;

    return revision ? (
      <Deployment
        deploymentId={deploymentId}
        revision={revision}
        className={styles({ className })}
      />
    ) : null;
  }
  return null;
}
