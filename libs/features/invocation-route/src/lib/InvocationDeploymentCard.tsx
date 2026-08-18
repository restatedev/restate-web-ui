import type { Invocation } from '@restate/data-access/admin-api-spec';
import { Card, CardHeader } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { InvocationDeployment } from './InvocationDeployment';

export function InvocationDeploymentCard({
  invocation,
}: {
  invocation?: Invocation;
}) {
  const deploymentId =
    invocation?.last_attempt_deployment_id ?? invocation?.pinned_deployment_id;

  if (!invocation || !deploymentId) return null;

  return (
    <Card intent="none">
      <CardHeader title="Deployment" icon={IconName.Http}>
        <span className="text-2xs font-medium text-gray-400">
          {invocation.last_attempt_deployment_id ? 'Last attempt' : 'Pinned'}
        </span>
      </CardHeader>
      <InvocationDeployment
        invocation={invocation}
        variant="card"
        showSdk
        showGithub
      />
    </Card>
  );
}
