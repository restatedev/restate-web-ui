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
import { DEPLOYMENT_QUERY_PARAM } from './constants';
import { Link } from '@restate/ui/link';
import { useSearchParams } from 'react-router';
import { useRef } from 'react';

const styles = tv({
  base: 'flex flex-row items-center gap-2 relative border -m-1 p-1 transition-all ease-in-out text-code',
  variants: {
    isSelected: {
      true: 'bg-white shadow-sm rounded-lg border -mx-5 px-[1.25rem] z-10 font-medium',
      false: 'border-transparent',
    },
  },
});

export function Deployment({
  className,
  revision,
  deploymentId,
  highlightSelection = true,
}: {
  revision: ServiceRevision;
  className?: string;
  deploymentId?: DeploymentId;
  highlightSelection?: boolean;
}) {
  const { data: { deployments } = {} } = useListDeployments();
  const deployment = deploymentId ? deployments?.get(deploymentId) : undefined;
  const [searchParams] = useSearchParams();
  const isSelected =
    searchParams.get(DEPLOYMENT_QUERY_PARAM) === deploymentId &&
    highlightSelection;
  const linkRef = useRef<HTMLAnchorElement>(null);

  if (!deployment) {
    return null;
  }

  const deploymentEndpoint = getEndpoint(deployment);

  return (
    <div className={styles({ className, isSelected })}>
      <div className="shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md">
        <Icon
          name={isHttpDeployment(deployment) ? IconName.Http : IconName.Lambda}
          className="w-full h-full text-zinc-400 p-1"
        />
      </div>

      <div className="flex flex-row gap-1 items-center  text-zinc-600 truncate min-w-[6ch]">
        <TruncateWithTooltip copyText={deploymentEndpoint} triggerRef={linkRef}>
          {deploymentEndpoint}
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          aria-label={deploymentEndpoint}
          variant="secondary"
          href={`?${DEPLOYMENT_QUERY_PARAM}=${deployment.id}`}
          className="outline-offset-0 m-1 ml-0 rounded-full before:absolute before:inset-0 before:content-[''] before:rounded-lg hover:before:bg-black/[0.03] pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="w-4 h-4 text-gray-500"
          />
        </Link>
      </div>
      <Revision revision={revision} className="ml-auto z-[2]" />
    </div>
  );
}
