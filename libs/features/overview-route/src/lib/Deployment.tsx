import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { getEndpoint, isHttpDeployment } from './types';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  DeploymentId,
  Revision as ServiceRevision,
  useListDeployments,
} from '@restate/data-access/admin-api';
import { Revision } from './Revision';

const styles = tv({
  base: 'flex flex-row items-center gap-2',
});

export function Deployment({
  className,
  revision,
  deploymentId,
}: {
  revision: ServiceRevision;
  className?: string;
  deploymentId?: DeploymentId;
}) {
  const { data: { deployments } = {} } = useListDeployments();
  const deployment = deploymentId ? deployments?.get(deploymentId) : undefined;
  if (!deployment) {
    return null;
  }

  return (
    <div className={styles({ className })}>
      <div className="shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md">
        <Icon
          name={isHttpDeployment(deployment) ? IconName.Http : IconName.Lambda}
          className="w-full h-full text-zinc-400 p-1"
        />
      </div>

      <div className="text-code text-zinc-600 truncate">
        <TruncateWithTooltip copyText={getEndpoint(deployment)}>
          {getEndpoint(deployment)}
        </TruncateWithTooltip>
      </div>
      <Revision revision={revision} className="ml-auto" />
    </div>
  );
}
