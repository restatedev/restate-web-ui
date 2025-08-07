import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  DeploymentId,
  Revision as ServiceRevision,
  useListDeployments,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api';
import { Revision } from './Revision';
import { DEPLOYMENT_QUERY_PARAM } from './constants';
import { Link } from '@restate/ui/link';
import { useRef } from 'react';
import { useActiveSidebarParam } from '@restate/ui/layout';

const styles = tv({
  base: 'flex flex-row items-center gap-2 relative border -m-1 p-1 transition-all ease-in-out text-code',
  variants: {
    isSelected: {
      true: 'bg-white shadow-xs shadow-zinc-800/3 rounded-lg border -mx-1 px-1 z-10 font-medium',
      false: 'border-transparent',
    },
  },
});

export function Deployment({
  className,
  revision,
  deploymentId,
  highlightSelection = true,
  showEndpoint = true,
}: {
  revision?: ServiceRevision;
  className?: string;
  deploymentId?: DeploymentId;
  highlightSelection?: boolean;
  showEndpoint?: boolean;
}) {
  const { data: { deployments } = {} } = useListDeployments({
    refetchOnMount: false,
  });
  const deployment = deploymentId ? deployments?.get(deploymentId) : undefined;
  const activeDeploymentInSidebar = useActiveSidebarParam(
    DEPLOYMENT_QUERY_PARAM,
  );

  const isSelected =
    activeDeploymentInSidebar === deploymentId && highlightSelection;
  const linkRef = useRef<HTMLAnchorElement>(null);

  if (!deployment) {
    return null;
  }

  const deploymentEndpoint = getEndpoint(deployment);

  return (
    <div className={styles({ className, isSelected })}>
      <div className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs">
        <Icon
          name={isHttpDeployment(deployment) ? IconName.Http : IconName.Lambda}
          className="h-full w-full p-1 text-zinc-400"
        />
      </div>

      <div className="flex min-w-[6ch] flex-row items-center gap-1 truncate text-zinc-600">
        <TruncateWithTooltip copyText={deploymentEndpoint} triggerRef={linkRef}>
          {showEndpoint ? deploymentEndpoint : deploymentId}
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          aria-label={deploymentEndpoint}
          variant="secondary"
          href={`?${DEPLOYMENT_QUERY_PARAM}=${deployment.id}`}
          className="m-1 ml-0 rounded-full outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="h-4 w-4 text-gray-500"
          />
        </Link>
      </div>
      {revision && <Revision revision={revision} className="z-2 ml-auto" />}
    </div>
  );
}
