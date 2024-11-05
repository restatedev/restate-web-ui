import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { getEndpoint, isHttpDeployment } from './types';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  DeploymentId,
  Revision,
  useListDeployments,
} from '@restate/data-access/admin-api';

const styles = tv({
  base: 'flex flex-row items-center gap-2',
});

export function Deployment({
  className,
  revision,
  deploymentId,
}: {
  revision: Revision;
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
      <div className="h-6 w-6 bg-white border shadow-sm rounded-md">
        <Icon
          name={isHttpDeployment(deployment) ? IconName.Http : IconName.Lambda}
          className="w-full h-full text-zinc-400 p-1"
        />
      </div>

      <div className="text-code text-zinc-600 truncate">
        <TruncateWithTooltip>{getEndpoint(deployment)}</TruncateWithTooltip>
      </div>
      <div className="uppercase max-w-[12ch] truncate shrink-0 ml-auto font-semibold text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-white/50 ring-1 ring-inset ring-zinc-500/20 text-zinc-500">
        <TruncateWithTooltip copyText={String(revision)}>
          <span className="uppercase">rev. {revision}</span>
        </TruncateWithTooltip>
      </div>
    </div>
  );
}
